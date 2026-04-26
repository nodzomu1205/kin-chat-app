import { resolveIngestExtractionArtifacts } from "@/lib/app/ingest/fileIngestFlowBuilders";
import { buildCanonicalDocumentSummary } from "@/lib/app/ingest/ingestDocumentModel";
import type { DriveFolderNode } from "@/lib/app/google-drive/googleDriveApi";
import type { Message } from "@/types/chat";

export type { DriveFolderNode } from "@/lib/app/google-drive/googleDriveApi";

export type DrivePickerMode =
  | "file_import"
  | "folder_index"
  | "folder_import";

export type DrivePickerDocument = {
  id: string;
  name?: string;
  mimeType?: string;
  type?: string;
};

export type DrivePickedImportAction =
  | {
      kind: "folder";
      folder: { id: string; name: string };
      mode: "index" | "import";
    }
  | {
      kind: "file";
      file: { id: string; name: string; mimeType: string };
    };

function formatDriveTimestamp(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function formatDriveSize(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "";
  }
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function isDriveFolder(entry: Pick<DriveFolderNode, "mimeType">) {
  return entry.mimeType === "application/vnd.google-apps.folder";
}

export function canImportDriveMimeType(mimeType?: string): mimeType is string {
  if (!mimeType) return false;
  if (mimeType.startsWith("text/")) return true;
  if (mimeType === "application/pdf") return true;
  if (mimeType === "application/json") return true;
  if (mimeType === "application/xml") return true;
  if (mimeType === "application/vnd.google-apps.document") return true;
  if (mimeType === "application/vnd.google-apps.spreadsheet") return true;
  return false;
}

function isImportableDriveEntry(entry: Pick<DriveFolderNode, "mimeType">) {
  return canImportDriveMimeType(entry.mimeType);
}

export function resolveDrivePickedImportAction(args: {
  doc: DrivePickerDocument;
  mode: DrivePickerMode;
}): DrivePickedImportAction | null {
  if (args.doc.mimeType === "application/vnd.google-apps.folder") {
    return {
      kind: "folder",
      folder: {
        id: args.doc.id,
        name: args.doc.name || "Google Drive Folder",
      },
      mode: args.mode === "folder_index" ? "index" : "import",
    };
  }

  if (!canImportDriveMimeType(args.doc.mimeType)) return null;

  return {
    kind: "file",
    file: {
      id: args.doc.id,
      name: args.doc.name || "Google Drive File",
      mimeType: args.doc.mimeType,
    },
  };
}

export function buildDriveFolderIndexMessage(args: {
  folderName: string;
  entries: DriveFolderNode[];
}) {
  const folderCount = args.entries.filter((entry) => isDriveFolder(entry)).length;
  const fileCount = args.entries.length - folderCount;
  const importableCount = args.entries.filter(
    (entry) => !isDriveFolder(entry) && isImportableDriveEntry(entry)
  ).length;

  const lines = args.entries.map((entry, index) => {
    const metadata = [
      formatDriveTimestamp(entry.modifiedTime),
      !isDriveFolder(entry) ? formatDriveSize(entry.sizeBytes) : "",
      !isDriveFolder(entry) && isImportableDriveEntry(entry) ? "importable" : "",
    ].filter(Boolean);

    const kindLabel = isDriveFolder(entry) ? "[Folder]" : "[File]";
    return `${index + 1}. ${kindLabel} ${entry.path}${
      metadata.length > 0 ? ` | ${metadata.join(" | ")}` : ""
    }`;
  });

  return [
    `Google Drive folder index: ${args.folderName}`,
    `Items: ${args.entries.length} (folders ${folderCount}, files ${fileCount}, importable ${importableCount})`,
    lines.length > 0 ? lines.join("\n") : "No files found.",
  ].join("\n\n");
}

export function buildDriveUploadDestinationPrompt(args: {
  childFolders: Array<{ name: string; modifiedTime?: string }>;
}) {
  const folderLines = args.childFolders.map((folder, index) => {
    const timestamp = formatDriveTimestamp(folder.modifiedTime);
    return `${index + 1}. ${folder.name}${timestamp ? ` (${timestamp})` : ""}`;
  });

  return [
    `The configured Google Drive folder has ${args.childFolders.length} child folder${
      args.childFolders.length === 1 ? "" : "s"
    }.`,
    "Enter one of the numbers below to save into that child folder.",
    "Leave blank or enter 0 to save to the configured parent folder.",
    folderLines.join("\n"),
  ].join("\n");
}

export function resolveDriveUploadDestinationIndex(args: {
  input: string | null;
  childFolderCount: number;
}) {
  const normalized = args.input?.trim() || "";
  if (!normalized || normalized === "0") return -1;
  if (!/^\d+$/.test(normalized)) return null;

  const index = Number(normalized) - 1;
  if (index < 0 || index >= args.childFolderCount) return null;
  return index;
}

function isSummaryCandidateTooClose(args: {
  candidate: string;
  fullText: string;
}) {
  const normalizedCandidate = args.candidate.replace(/\s+/g, " ").trim();
  const normalizedFullText = args.fullText.replace(/\s+/g, " ").trim();
  if (!normalizedCandidate || !normalizedFullText) return false;
  if (normalizedCandidate === normalizedFullText) return true;
  if (normalizedCandidate.length >= Math.floor(normalizedFullText.length * 0.8)) {
    return true;
  }
  return false;
}

export function buildDriveImportSummary(args: {
  result?: {
    structuredSummary?: unknown[];
    kinCompact?: unknown[];
  };
  fallbackText: string;
  fallbackTitle: string;
}) {
  const summaryLines = Array.isArray(args.result?.structuredSummary)
    ? args.result.structuredSummary.filter(
        (line): line is string => typeof line === "string" && line.trim().length > 0
      )
    : [];
  const compactLines = Array.isArray(args.result?.kinCompact)
    ? args.result.kinCompact.filter(
        (line): line is string => typeof line === "string" && line.trim().length > 0
      )
    : [];
  const preferredCandidate = compactLines.join(" ").trim() || summaryLines.join(" ").trim();
  if (
    preferredCandidate &&
    !isSummaryCandidateTooClose({
      candidate: preferredCandidate,
      fullText: args.fallbackText,
    })
  ) {
    return preferredCandidate;
  }
  return buildCanonicalDocumentSummary(args.fallbackText, args.fallbackTitle);
}

export function buildDriveImportStoredText(result: {
  selectedLines?: unknown[];
  rawText?: string;
  summaryText?: string;
  detailText?: string;
}) {
  return resolveIngestExtractionArtifacts({
    data: { result } as never,
    fileName: "",
    fileTitle: "",
  }).canonicalDocumentText;
}

export function buildDriveImportFailedMessage(args: {
  errorMessage: string;
}) {
  return `Google Drive import failed: ${args.errorMessage}`;
}

export function buildDriveImportSavedInfoMessage(args: {
  title: string;
  storedDocumentCharCount: number;
}) {
  return [
    `Google Driveファイルをライブラリに保存しました: ${args.title}`,
    `抽出文字数: ${args.storedDocumentCharCount.toLocaleString("ja-JP")} chars`,
  ].join("\n");
}

export function buildDriveUploadCancelledMessage() {
  return "Google Drive upload cancelled.";
}

export function buildDriveUploadInvalidSelectionMessage() {
  return "Google Drive upload cancelled: invalid child-folder selection.";
}

export function buildDriveUploadCompletedMessage(args: {
  fileName: string;
  destinationFolderName: string;
}) {
  return `Google Drive uploaded: ${args.fileName} -> ${args.destinationFolderName}`;
}

export function buildDriveUiMessage(args: {
  id: string;
  text: string;
  sourceType?: NonNullable<Message["meta"]>["sourceType"];
}): Message {
  return {
    id: args.id,
    role: "gpt",
    text: args.text,
    meta: {
      kind: "task_info",
      sourceType: args.sourceType || "manual",
    },
  };
}
