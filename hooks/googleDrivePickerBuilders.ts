export type DriveFolderNode = {
  id: string;
  name: string;
  mimeType: string;
  path: string;
  modifiedTime?: string;
  sizeBytes?: number | null;
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

function isImportableDriveEntry(entry: Pick<DriveFolderNode, "mimeType">) {
  const mimeType = entry.mimeType;
  if (!mimeType) return false;
  if (mimeType.startsWith("text/")) return true;
  if (mimeType === "application/pdf") return true;
  if (mimeType === "application/json") return true;
  if (mimeType === "application/xml") return true;
  if (mimeType === "application/vnd.google-apps.document") return true;
  if (mimeType === "application/vnd.google-apps.spreadsheet") return true;
  return false;
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
