import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Message, ReferenceLibraryItem, StoredDocument } from "@/types/chat";
import {
  DEFAULT_GOOGLE_DRIVE_FOLDER_LINK,
  resolveGoogleDriveFolderId,
  sanitizeGoogleDriveFolderLink,
} from "@/lib/app/googleDriveLink";
import { buildLibraryItemDriveExport } from "@/lib/app/referenceLibraryItemActions";
import {
  requestFileIngest,
  resolveIngestErrorMessage,
  resolveIngestFileTitle,
  type SharedIngestOptions,
} from "@/lib/app/ingestClient";
import {
  normalizeLibrarySummaryUsage,
  requestGeneratedLibrarySummary,
} from "@/lib/app/librarySummaryClient";
import {
  cleanImportedDocumentText,
  cleanImportSummarySource,
} from "@/lib/app/importSummaryText";
import {
  buildCanonicalDocumentSummary,
  buildCanonicalSummarySource,
  resolveCanonicalDocumentText,
} from "@/lib/app/ingestDocumentModel";
import { normalizeUsage } from "@/lib/tokenStats";

const GOOGLE_API_KEY = "AIzaSyCQc_DKFE3WxU6SgVSE47X2SQv7nxZvm08";
const GOOGLE_OAUTH_CLIENT_ID =
  "593361829346-aq6ofe9uttbovg08hi8s14lqv7gj684o.apps.googleusercontent.com";
const GOOGLE_PICKER_APP_ID = "593361829346";
const GOOGLE_PICKER_SCOPE = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly";

const GOOGLE_API_SCRIPT = "https://apis.google.com/js/api.js";
const GOOGLE_GIS_SCRIPT = "https://accounts.google.com/gsi/client";

type GooglePickerDocument = {
  id: string;
  name?: string;
  mimeType?: string;
  type?: string;
};

type DriveFolderNode = {
  id: string;
  name: string;
  mimeType: string;
  path: string;
};

type GooglePickerCallbackData = {
  action?: string;
  docs?: GooglePickerDocument[];
};

type GoogleDrivePickerMode =
  | "file_import"
  | "folder_index"
  | "folder_import";

declare global {
  interface Window {
    gapi?: any;
    google?: any;
  }
}

type UseGoogleDrivePickerArgs = {
  folderLink: string;
  setFolderLink: (value: string) => void;
  ingestOptions: SharedIngestOptions;
  autoSummarizeImports: boolean;
  currentTaskId?: string;
  recordIngestedDocument: (
    document: Omit<StoredDocument, "id" | "sourceType">
  ) => StoredDocument;
  setGptMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  applyIngestUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
  applySummaryUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
  focusGptPanel: () => boolean;
};

function appendUiMessage(
  setGptMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  text: string
) {
  setGptMessages((prev) => [
    ...prev,
    {
      id: `drive-ui-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: "user",
      text,
      meta: {
        kind: "task_info",
        sourceType: "manual",
      },
    },
  ]);
}

function loadScript(src: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const existing = window.document.querySelector(`script[src="${src}"]`);
  if (existing) {
    if ((existing as HTMLScriptElement).dataset.loaded === "true") {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), {
        once: true,
      });
    });
  }

  return new Promise((resolve, reject) => {
    const script = window.document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    window.document.head.appendChild(script);
  });
}

async function fetchDriveJson<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Drive request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

async function fetchDriveFileBlob(args: {
  fileId: string;
  mimeType: string;
  accessToken: string;
}): Promise<Blob> {
  const exportMimeType =
    args.mimeType === "application/vnd.google-apps.document"
      ? "text/plain"
      : args.mimeType === "application/vnd.google-apps.spreadsheet"
        ? "text/csv"
        : "";
  const url = exportMimeType
    ? `https://www.googleapis.com/drive/v3/files/${args.fileId}/export?mimeType=${encodeURIComponent(
        exportMimeType
      )}`
    : `https://www.googleapis.com/drive/v3/files/${args.fileId}?alt=media`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Drive file fetch failed: ${response.status}`);
  }
  return response.blob();
}

async function uploadDriveTextFile(args: {
  accessToken: string;
  folderId: string;
  fileName: string;
  text: string;
}) {
  const metadata = {
    name: args.fileName,
    parents: [args.folderId],
    mimeType: "text/plain",
  };
  const boundary = `drive-upload-${Math.random().toString(36).slice(2, 10)}`;
  const payload =
    `--${boundary}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    "Content-Type: text/plain; charset=UTF-8\r\n\r\n" +
    `${args.text}\r\n` +
    `--${boundary}--`;

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: payload,
    }
  );

  if (!response.ok) {
    throw new Error(`Drive upload failed: ${response.status}`);
  }

  return (await response.json()) as {
    id: string;
    name: string;
    webViewLink?: string;
  };
}

function canImportDriveMimeType(mimeType?: string) {
  if (!mimeType) return false;
  if (mimeType.startsWith("text/")) return true;
  if (mimeType === "application/pdf") return true;
  if (mimeType === "application/json") return true;
  if (mimeType === "application/xml") return true;
  if (mimeType === "application/vnd.google-apps.document") return true;
  if (mimeType === "application/vnd.google-apps.spreadsheet") return true;
  return false;
}

function summarizeImportedText(text: string, fallbackTitle: string) {
  const cleanedText = cleanImportSummarySource(text);
  const normalized = cleanedText.replace(/\s+/g, " ").trim();
  if (!normalized) return fallbackTitle;
  const paragraphLeads = cleanedText
    .split(/\n{2,}/)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((block) => {
      const sentenceMatch = block.match(/^(.+?[。．.!?！？])(?=\s|$)/u);
      return sentenceMatch?.[1]?.trim() || block;
    });

  const candidate = paragraphLeads
    .slice(0, 4)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (candidate) {
    return candidate;
  }

  return normalized;
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

function buildDriveImportSummary(args: {
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

function buildDriveImportStoredText(result: {
  selectedLines?: unknown[];
  rawText?: string;
}) {
  const selectedLines = Array.isArray(result.selectedLines)
    ? result.selectedLines.filter(
        (line): line is string => typeof line === "string" && line.trim().length > 0
      )
    : [];
  const selectedText = selectedLines.join("\n").trim();
  const rawText = typeof result.rawText === "string" ? result.rawText.trim() : "";
  return resolveCanonicalDocumentText({
    selectedText,
    rawText,
  });
}

async function listDriveFolderChildren(args: {
  accessToken: string;
  folderId: string;
  currentPath: string;
}): Promise<DriveFolderNode[]> {
  const files: DriveFolderNode[] = [];
  let pageToken = "";

  do {
    const response = await fetchDriveJson<{
      files?: Array<{ id: string; name: string; mimeType: string }>;
      nextPageToken?: string;
    }>(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        `'${args.folderId}' in parents and trashed = false`
      )}&fields=nextPageToken,files(id,name,mimeType)&pageSize=200${
        pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""
      }`,
      args.accessToken
    );

    for (const file of response.files || []) {
      const path = `${args.currentPath}/${file.name}`;
      files.push({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        path,
      });
      if (file.mimeType === "application/vnd.google-apps.folder") {
        files.push(
          ...(await listDriveFolderChildren({
            accessToken: args.accessToken,
            folderId: file.id,
            currentPath: path,
          }))
        );
      }
    }

    pageToken = response.nextPageToken || "";
  } while (pageToken);

  return files;
}

function buildDriveFolderIndexMessage(args: {
  folderName: string;
  entries: Array<{ path: string; mimeType: string }>;
}) {
  const lines = args.entries.map(
    (entry, index) => `${index + 1}. ${entry.path} (${entry.mimeType})`
  );
  return [
    `Google Drive folder index: ${args.folderName}`,
    lines.length > 0 ? lines.join("\n") : "No files found.",
  ].join("\n\n");
}

export function useGoogleDrivePicker({
  folderLink,
  setFolderLink,
  ingestOptions,
  autoSummarizeImports,
  currentTaskId,
  recordIngestedDocument,
  setGptMessages,
  applyIngestUsage,
  applySummaryUsage,
  focusGptPanel,
}: UseGoogleDrivePickerArgs) {
  const [pickerReady, setPickerReady] = useState(false);
  const tokenClientRef = useRef<any>(null);
  const accessTokenRef = useRef<string>("");
  const folderId = useMemo(() => resolveGoogleDriveFolderId(folderLink), [folderLink]);

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      if (typeof window === "undefined") return;
      await Promise.all([loadScript(GOOGLE_API_SCRIPT), loadScript(GOOGLE_GIS_SCRIPT)]);
      await new Promise<void>((resolve) => {
        window.gapi.load("picker", resolve);
      });
      if (!window.google?.accounts?.oauth2) return;
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_OAUTH_CLIENT_ID,
        scope: GOOGLE_PICKER_SCOPE,
        callback: () => {},
      });
      if (!cancelled) setPickerReady(true);
    }

    void prepare();
    return () => {
      cancelled = true;
    };
  }, []);

  const ensureAccessToken = useCallback(async () => {
    if (accessTokenRef.current) return accessTokenRef.current;
    if (!tokenClientRef.current) {
      throw new Error("Google Picker is not ready.");
    }

    return await new Promise<string>((resolve, reject) => {
      tokenClientRef.current.callback = (response: { access_token?: string; error?: string }) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error || "Missing Google access token."));
          return;
        }
        accessTokenRef.current = response.access_token;
        resolve(response.access_token);
      };
      tokenClientRef.current.requestAccessToken({ prompt: "consent" });
    });
  }, []);

  const importDriveFile = useCallback(
    async (file: { id: string; name: string; mimeType: string; path?: string }) => {
      const accessToken = await ensureAccessToken();
      const blob = await fetchDriveFileBlob({
        fileId: file.id,
        mimeType: file.mimeType,
        accessToken,
      });
      const downloadedFile = new File([blob], file.name, {
        type:
          file.mimeType === "application/vnd.google-apps.spreadsheet"
            ? "text/csv"
            : blob.type || file.mimeType || "application/octet-stream",
      });
      const { response, data } = await requestFileIngest({
        file: downloadedFile,
        options: ingestOptions,
      });
      applyIngestUsage(data?.usage);
      if (!response.ok) {
        appendUiMessage(
          setGptMessages,
          `Google Drive import failed: ${resolveIngestErrorMessage({
            data,
            fallback: `Failed to import ${file.name}.`,
          })}`
        );
        focusGptPanel();
        return;
      }

      const storedText = buildDriveImportStoredText(data?.result || {});
      const title = file.path || resolveIngestFileTitle({
        data,
        fallback: file.name,
      });
      const rawTextForSummary = buildCanonicalSummarySource(storedText);
      let summary = buildDriveImportSummary({
        result: data?.result,
        fallbackText: rawTextForSummary,
        fallbackTitle: title,
      });

      if (autoSummarizeImports && rawTextForSummary) {
        try {
          const summaryResult = await requestGeneratedLibrarySummary({
            title,
            text: rawTextForSummary,
          });
          if (summaryResult.summary?.trim()) {
            summary = cleanImportSummarySource(summaryResult.summary).trim();
          }
          applySummaryUsage(normalizeLibrarySummaryUsage(summaryResult.usage));
        } catch (error) {
          console.warn("Drive import summary generation failed", error);
        }
      }

      recordIngestedDocument({
        title,
        filename: title,
        text: storedText,
        summary,
        taskId: currentTaskId,
        charCount: storedText.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    },
    [
      applyIngestUsage,
      applySummaryUsage,
      currentTaskId,
      ensureAccessToken,
      focusGptPanel,
      ingestOptions,
      recordIngestedDocument,
      setGptMessages,
      autoSummarizeImports,
    ]
  );

  const importDriveFolder = useCallback(
    async (folder: { id: string; name: string }, mode: "index" | "import") => {
      const accessToken = await ensureAccessToken();
      const entries = await listDriveFolderChildren({
        accessToken,
        folderId: folder.id,
        currentPath: folder.name,
      });
      appendUiMessage(
        setGptMessages,
        buildDriveFolderIndexMessage({
          folderName: folder.name,
          entries,
        })
      );
      focusGptPanel();
      if (mode === "index") return;
      const files = entries.filter((file) => canImportDriveMimeType(file.mimeType));
      for (const file of files) {
        await importDriveFile(file);
      }
    },
    [ensureAccessToken, focusGptPanel, importDriveFile, setGptMessages]
  );

  const openPickerForMode = useCallback(async (mode: GoogleDrivePickerMode) => {
    if (typeof window === "undefined" || !window.google?.picker) return;
    const accessToken = await ensureAccessToken();
    const docsView = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(true);
    const foldersView = new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS)
      .setIncludeFolders(true)
      .setMimeTypes("application/vnd.google-apps.folder")
      .setSelectFolderEnabled(true);

    if (folderId) {
      docsView.setParent(folderId);
      foldersView.setParent(folderId);
    }

    const pickerBuilder = new window.google.picker.PickerBuilder()
      .setAppId(GOOGLE_PICKER_APP_ID)
      .setDeveloperKey(GOOGLE_API_KEY)
      .setOAuthToken(accessToken)
      .setCallback(async (data: GooglePickerCallbackData) => {
        if (data.action !== window.google.picker.Action.PICKED) return;
        const picked = data.docs || [];
        for (const doc of picked) {
          if (doc.mimeType === "application/vnd.google-apps.folder") {
            await importDriveFolder({
              id: doc.id,
              name: doc.name || "Google Drive Folder",
            }, mode === "folder_index" ? "index" : "import");
            continue;
          }
          if (!canImportDriveMimeType(doc.mimeType)) continue;
          await importDriveFile({
            id: doc.id,
            name: doc.name || "Google Drive File",
            mimeType: doc.mimeType || "text/plain",
          });
        }
      });

    if (mode === "file_import") {
      pickerBuilder.addView(docsView);
    } else {
      pickerBuilder.addView(foldersView);
    }

    const picker = pickerBuilder.build();
    picker.setVisible(true);
  }, [ensureAccessToken, folderId, importDriveFile, importDriveFolder]);

  const uploadLibraryItemToDrive = useCallback(
    async (item: ReferenceLibraryItem) => {
      if (typeof window === "undefined" || !folderId) return false;
      const normalizedFolderLink = sanitizeGoogleDriveFolderLink(
        folderLink || DEFAULT_GOOGLE_DRIVE_FOLDER_LINK
      );
      if (normalizedFolderLink !== folderLink) {
        setFolderLink(normalizedFolderLink);
      }
      const accessToken = await ensureAccessToken();
      const artifact = buildLibraryItemDriveExport(item);
      const uploaded = await uploadDriveTextFile({
        accessToken,
        folderId,
        fileName: artifact.fileName,
        text: artifact.text,
      });
      appendUiMessage(
        setGptMessages,
        `Google Drive uploaded: ${uploaded.name || artifact.fileName}`
      );
      focusGptPanel();
      return true;
    },
    [
      ensureAccessToken,
      focusGptPanel,
      folderId,
      folderLink,
      setFolderLink,
      setGptMessages,
    ]
  );

  return {
    pickerReady,
    googleDriveFolderId: folderId,
    openFileImportPicker: () => openPickerForMode("file_import"),
    openFolderIndexPicker: () => openPickerForMode("folder_index"),
    openFolderImportPicker: () => openPickerForMode("folder_import"),
    uploadLibraryItemToDrive,
  };
}
