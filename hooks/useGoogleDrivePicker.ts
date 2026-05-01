import { useCallback, useMemo } from "react";
import type { Message, ReferenceLibraryItem, StoredDocument } from "@/types/chat";
import {
  DEFAULT_GOOGLE_DRIVE_FOLDER_LINK,
  resolveGoogleDriveFolderId,
  sanitizeGoogleDriveFolderLink,
} from "@/lib/app/google-drive/googleDriveLink";
import type { SharedIngestOptions } from "@/lib/app/ingest/ingestClient";
import {
  buildDriveUiMessage,
  type DrivePickerMode,
} from "@/hooks/googleDrivePickerBuilders";
import {
  runDriveFileImport,
  runDriveImageFileImport,
  runDriveFolderImport,
  runDrivePickedDocumentsImport,
  runDriveLibraryItemUpload,
} from "@/hooks/googleDriveImportExecution";
import {
  useGoogleDrivePickerRuntime,
  openGoogleDrivePicker,
} from "@/hooks/googleDrivePickerRuntime";
import { normalizeUsage } from "@/lib/shared/tokenStats";
import type { ImageLibraryImportMode } from "@/lib/app/image/imageImportFlow";

type UseGoogleDrivePickerArgs = {
  folderLink: string;
  setFolderLink: (value: string) => void;
  ingestOptions: SharedIngestOptions;
  autoGenerateLibrarySummary: boolean;
  currentTaskId?: string;
  recordIngestedDocument: (
    document: Omit<StoredDocument, "id" | "sourceType">
  ) => StoredDocument;
  setGptMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setIngestLoading: React.Dispatch<React.SetStateAction<boolean>>;
  applyIngestUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
  focusGptPanel: () => boolean;
  imageLibraryImportEnabled: boolean;
  imageLibraryImportMode: ImageLibraryImportMode;
};

function appendUiMessage(
  setGptMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  text: string,
  sourceType: NonNullable<Message["meta"]>["sourceType"] = "manual"
) {
  setGptMessages((prev) => [
    ...prev,
    buildDriveUiMessage({
      id: `drive-ui-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      sourceType,
    }),
  ]);
}

export function useGoogleDrivePicker({
  folderLink,
  setFolderLink,
  ingestOptions,
  autoGenerateLibrarySummary,
  currentTaskId,
  recordIngestedDocument,
  setGptMessages,
  setIngestLoading,
  applyIngestUsage,
  focusGptPanel,
  imageLibraryImportEnabled,
  imageLibraryImportMode,
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
          autoGenerateLibrarySummary,
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
      autoGenerateLibrarySummary,
    ]
  );

  const importDriveImageFile = useCallback(
    async (
      file: { id: string; name: string; mimeType: string; path?: string },
      options: { manageLoading?: boolean } = {}
    ) => {
      const manageLoading = options.manageLoading !== false;
      if (manageLoading) setIngestLoading(true);

      try {
        await runDriveImageFileImport({
          file,
          ensureAccessToken,
          ingestOptions,
          autoGenerateLibrarySummary,
          currentTaskId,
          imageLibraryImportEnabled,
          imageLibraryImportMode,
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
      autoGenerateLibrarySummary,
      currentTaskId,
      ensureAccessToken,
      focusGptPanel,
      imageLibraryImportEnabled,
      imageLibraryImportMode,
      ingestOptions,
      recordIngestedDocument,
      setGptMessages,
      setIngestLoading,
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
    const accessToken = await ensureAccessToken();
    await openGoogleDrivePicker({
      mode,
      folderId,
      accessToken,
      onPickedDocs: async (docs) => {
        await runDrivePickedDocumentsImport({
          docs,
          mode,
          importDriveFile,
          importDriveFolder,
        });
      },
    });
  }, [ensureAccessToken, folderId, importDriveFile, importDriveFolder]);

  const openPickerForModeWithImporter = useCallback(
    async (
      mode: DrivePickerMode,
      fileImporter: (
        file: { id: string; name: string; mimeType: string; path?: string }
      ) => Promise<void>
    ) => {
      const accessToken = await ensureAccessToken();
      await openGoogleDrivePicker({
        mode,
        folderId,
        accessToken,
        onPickedDocs: async (docs) => {
          await runDrivePickedDocumentsImport({
            docs,
            mode,
            importDriveFile: fileImporter,
            importDriveFolder,
          });
        },
      });
    },
    [ensureAccessToken, folderId, importDriveFolder]
  );

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
    openImageFileImportPicker: () =>
      openPickerForModeWithImporter("file_import", importDriveImageFile),
    openFolderIndexPicker: () => openPickerForMode("folder_index"),
    openFolderImportPicker: () => openPickerForMode("folder_import"),
    uploadLibraryItemToDrive,
  };
}


