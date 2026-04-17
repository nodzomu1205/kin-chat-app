import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Message, ReferenceLibraryItem, StoredDocument } from "@/types/chat";
import {
  DEFAULT_GOOGLE_DRIVE_FOLDER_LINK,
  resolveGoogleDriveFolderId,
  sanitizeGoogleDriveFolderLink,
} from "@/lib/app/googleDriveLink";
import { buildLibraryItemDriveExport } from "@/lib/app/referenceLibraryItemActions";

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

type GooglePickerCallbackData = {
  action?: string;
  docs?: GooglePickerDocument[];
};

declare global {
  interface Window {
    gapi?: any;
    google?: any;
  }
}

type UseGoogleDrivePickerArgs = {
  folderLink: string;
  setFolderLink: (value: string) => void;
  recordIngestedDocument: (
    document: Omit<StoredDocument, "id" | "sourceType">
  ) => StoredDocument;
  setGptMessages: React.Dispatch<React.SetStateAction<Message[]>>;
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

async function fetchDriveTextFile(args: {
  fileId: string;
  mimeType: string;
  accessToken: string;
}): Promise<string> {
  const exportMimeType = args.mimeType.startsWith("application/vnd.google-apps")
    ? "text/plain"
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
  return response.text();
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
  if (mimeType === "application/json") return true;
  if (mimeType === "application/xml") return true;
  if (mimeType === "application/vnd.google-apps.document") return true;
  return false;
}

function buildDriveFolderIndexMessage(args: {
  folderName: string;
  files: Array<{ id: string; name: string; mimeType: string }>;
}) {
  const lines = args.files.map(
    (file, index) => `${index + 1}. ${file.name} (${file.mimeType})`
  );
  return [
    `Google Drive folder index: ${args.folderName}`,
    lines.length > 0 ? lines.join("\n") : "No files found.",
  ].join("\n\n");
}

export function useGoogleDrivePicker({
  folderLink,
  setFolderLink,
  recordIngestedDocument,
  setGptMessages,
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
    async (file: { id: string; name: string; mimeType: string }) => {
      const accessToken = await ensureAccessToken();
      const text = await fetchDriveTextFile({
        fileId: file.id,
        mimeType: file.mimeType,
        accessToken,
      });
      recordIngestedDocument({
        title: file.name,
        filename: file.name,
        text,
        summary: text.replace(/\s+/g, " ").trim().slice(0, 220),
        charCount: text.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    },
    [ensureAccessToken, recordIngestedDocument]
  );

  const importDriveFolder = useCallback(
    async (folder: { id: string; name: string }) => {
      const accessToken = await ensureAccessToken();
      const response = await fetchDriveJson<{
        files?: Array<{ id: string; name: string; mimeType: string }>;
      }>(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
          `'${folder.id}' in parents and trashed = false`
        )}&fields=files(id,name,mimeType)&pageSize=200`,
        accessToken
      );
      const files = (response.files || []).filter((file) => canImportDriveMimeType(file.mimeType));
      appendUiMessage(
        setGptMessages,
        buildDriveFolderIndexMessage({
          folderName: folder.name,
          files: response.files || [],
        })
      );
      focusGptPanel();
      for (const file of files) {
        await importDriveFile(file);
      }
    },
    [ensureAccessToken, focusGptPanel, importDriveFile, setGptMessages]
  );

  const openImportPicker = useCallback(async () => {
    if (typeof window === "undefined" || !window.google?.picker) return;
    const accessToken = await ensureAccessToken();
    const picker = new window.google.picker.PickerBuilder()
      .setAppId(GOOGLE_PICKER_APP_ID)
      .setDeveloperKey(GOOGLE_API_KEY)
      .setOAuthToken(accessToken)
      .addView(new window.google.picker.DocsView(window.google.picker.ViewId.DOCS))
      .addView(
        new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS)
          .setIncludeFolders(true)
          .setSelectFolderEnabled(true)
      )
      .setCallback(async (data: GooglePickerCallbackData) => {
        if (data.action !== window.google.picker.Action.PICKED) return;
        const picked = data.docs || [];
        for (const doc of picked) {
          if (doc.mimeType === "application/vnd.google-apps.folder") {
            await importDriveFolder({
              id: doc.id,
              name: doc.name || "Google Drive Folder",
            });
            continue;
          }
          if (!canImportDriveMimeType(doc.mimeType)) continue;
          await importDriveFile({
            id: doc.id,
            name: doc.name || "Google Drive File",
            mimeType: doc.mimeType || "text/plain",
          });
        }
      })
      .build();
    picker.setVisible(true);
  }, [ensureAccessToken, importDriveFile, importDriveFolder]);

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
    openImportPicker,
    uploadLibraryItemToDrive,
  };
}
