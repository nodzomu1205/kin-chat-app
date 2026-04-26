import { useCallback, useMemo } from "react";
import type { Message, ReferenceLibraryItem, StoredDocument } from "@/types/chat";
import {
  DEFAULT_GOOGLE_DRIVE_FOLDER_LINK,
  resolveGoogleDriveFolderId,
  sanitizeGoogleDriveFolderLink,
} from "@/lib/app/google-drive/googleDriveLink";
import type { SharedIngestOptions } from "@/lib/app/ingest/ingestClient";
import {
  resolveDrivePickedImportAction,
  type DrivePickerMode,
} from "@/hooks/googleDrivePickerBuilders";
import {
  runDriveFileImport,
  runDriveFolderImport,
  runDriveLibraryItemUpload,
} from "@/hooks/googleDriveImportExecution";
import {
  useGoogleDrivePickerRuntime,
  type GooglePickerCallbackData,
} from "@/hooks/googleDrivePickerRuntime";
import { normalizeUsage } from "@/lib/shared/tokenStats";

const GOOGLE_API_KEY = "AIzaSyCQc_DKFE3WxU6SgVSE47X2SQv7nxZvm08";
const GOOGLE_PICKER_APP_ID = "593361829346";

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
  setIngestLoading: React.Dispatch<React.SetStateAction<boolean>>;
  applyIngestUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
  focusGptPanel: () => boolean;
};

function appendUiMessage(
  setGptMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  text: string,
  sourceType: NonNullable<Message["meta"]>["sourceType"] = "manual"
) {
  setGptMessages((prev) => [
    ...prev,
    {
      id: `drive-ui-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: "gpt",
      text,
      meta: {
        kind: "task_info",
        sourceType,
      },
    },
  ]);
}

export function useGoogleDrivePicker({
  folderLink,
  setFolderLink,
  ingestOptions,
  autoSummarizeImports,
  currentTaskId,
  recordIngestedDocument,
  setGptMessages,
  setIngestLoading,
  applyIngestUsage,
  focusGptPanel,
}: UseGoogleDrivePickerArgs) {
  const { pickerReady, ensureAccessToken } = useGoogleDrivePickerRuntime();
  const folderId = useMemo(() => resolveGoogleDriveFolderId(folderLink), [folderLink]);

  const importDriveFile = useCallback(
    async (
      file: { id: string; name: string; mimeType: string; path?: string },
      options: { manageLoading?: boolean } = {}
    ) => {
      const manageLoading = options.manageLoading !== false;
      if (manageLoading) setIngestLoading(true);

      try {
        await runDriveFileImport({
          file,
          ensureAccessToken,
          ingestOptions,
          autoSummarizeImports,
          currentTaskId,
          recordIngestedDocument,
          appendUiMessage: (text, sourceType) => {
            appendUiMessage(setGptMessages, text, sourceType);
          },
          applyIngestUsage,
          focusGptPanel,
        });
      } finally {
        if (manageLoading) setIngestLoading(false);
      }
    },
    [
      applyIngestUsage,
      currentTaskId,
      ensureAccessToken,
      focusGptPanel,
      ingestOptions,
      recordIngestedDocument,
      setIngestLoading,
      setGptMessages,
      autoSummarizeImports,
    ]
  );

  const importDriveFolder = useCallback(
    async (folder: { id: string; name: string }, mode: "index" | "import") => {
      setIngestLoading(true);
      try {
        await runDriveFolderImport({
          folder,
          mode,
          ensureAccessToken,
          appendUiMessage: (text, sourceType) => {
            appendUiMessage(setGptMessages, text, sourceType);
          },
          importDriveFile,
          focusGptPanel,
        });
      } finally {
        setIngestLoading(false);
      }
    },
    [ensureAccessToken, focusGptPanel, importDriveFile, setGptMessages, setIngestLoading]
  );

  const openPickerForMode = useCallback(async (mode: DrivePickerMode) => {
    if (typeof window === "undefined") return;
    const pickerApi = window.google?.picker;
    if (!pickerApi) return;
    const accessToken = await ensureAccessToken();
    const docsView = new pickerApi.DocsView(pickerApi.ViewId.DOCS)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(true);
    const foldersView = new pickerApi.DocsView(pickerApi.ViewId.FOLDERS)
      .setIncludeFolders(true)
      .setMimeTypes("application/vnd.google-apps.folder")
      .setSelectFolderEnabled(true);

    if (folderId) {
      docsView.setParent(folderId);
      foldersView.setParent(folderId);
    }

    const pickerBuilder = new pickerApi.PickerBuilder()
      .setAppId(GOOGLE_PICKER_APP_ID)
      .setDeveloperKey(GOOGLE_API_KEY)
      .setOAuthToken(accessToken)
      .setCallback(async (data: GooglePickerCallbackData) => {
        if (data.action !== pickerApi.Action.PICKED) return;
        const picked = data.docs || [];
        for (const doc of picked) {
          const action = resolveDrivePickedImportAction({ doc, mode });
          if (!action) continue;
          if (action.kind === "folder") {
            await importDriveFolder(action.folder, action.mode);
            continue;
          }
          await importDriveFile(action.file);
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
      if (typeof window === "undefined" || !folderId) {
        return "unavailable" as const;
      }
      const normalizedFolderLink = sanitizeGoogleDriveFolderLink(
        folderLink || DEFAULT_GOOGLE_DRIVE_FOLDER_LINK
      );
      if (normalizedFolderLink && normalizedFolderLink !== folderLink) {
        setFolderLink(normalizedFolderLink);
      }
      return await runDriveLibraryItemUpload({
        item,
        folderId,
        ensureAccessToken,
        promptForDestination: (message) => window.prompt(message),
        appendUiMessage: (text, sourceType) => {
          appendUiMessage(setGptMessages, text, sourceType);
        },
        focusGptPanel,
      });
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


