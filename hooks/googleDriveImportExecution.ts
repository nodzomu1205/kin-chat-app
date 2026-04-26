import type { Message, StoredDocument } from "@/types/chat";
import {
  fetchDriveFileBlob,
  listDriveChildFolders,
  listDriveFolderChildren,
  uploadDriveTextFile,
  type DriveFolderNode,
} from "@/lib/app/google-drive/googleDriveApi";
import { buildLibraryItemDriveExport } from "@/lib/app/reference-library/referenceLibraryItemActions";
import {
  requestFileIngest,
  resolveIngestErrorMessage,
  resolveIngestFileTitle,
  type SharedIngestOptions,
} from "@/lib/app/ingest/ingestClient";
import {
  buildCanonicalSummarySource,
} from "@/lib/app/ingest/ingestDocumentModel";
import { prepareIngestedStoredDocument } from "@/lib/app/ingest/ingestStoredDocumentPreparation";
import { normalizeUsage } from "@/lib/shared/tokenStats";
import {
  buildDriveImportFailedMessage,
  buildDriveImportSavedInfoMessage,
  buildDriveImportStoredText,
  buildDriveImportSummary,
  buildDriveFolderIndexMessage,
  buildDriveUploadCancelledMessage,
  buildDriveUploadCompletedMessage,
  buildDriveUploadDestinationPrompt,
  buildDriveUploadInvalidSelectionMessage,
  canImportDriveMimeType,
  resolveDrivePickedImportAction,
  resolveDriveUploadDestinationIndex,
  type DrivePickerDocument,
  type DrivePickerMode,
} from "@/hooks/googleDrivePickerBuilders";
import type { ReferenceLibraryItem } from "@/types/chat";

export type DriveImportFile = {
  id: string;
  name: string;
  mimeType: string;
  path?: string;
};

export type DriveUiMessageSourceType = NonNullable<Message["meta"]>["sourceType"];

export type DriveImportFolder = {
  id: string;
  name: string;
};

export type DriveFolderImportMode = "index" | "import";

export type RunDrivePickedDocumentsImportArgs = {
  docs: DrivePickerDocument[];
  mode: DrivePickerMode;
  importDriveFile: (
    file: DriveImportFile,
    options?: { manageLoading?: boolean }
  ) => Promise<void>;
  importDriveFolder: (
    folder: DriveImportFolder,
    mode: DriveFolderImportMode
  ) => Promise<void>;
};

export async function runDrivePickedDocumentsImport({
  docs,
  mode,
  importDriveFile,
  importDriveFolder,
}: RunDrivePickedDocumentsImportArgs) {
  for (const doc of docs) {
    const action = resolveDrivePickedImportAction({ doc, mode });
    if (!action) continue;
    if (action.kind === "folder") {
      await importDriveFolder(action.folder, action.mode);
      continue;
    }
    await importDriveFile(action.file);
  }
}

export type RunDriveFileImportArgs = {
  file: DriveImportFile;
  ensureAccessToken: () => Promise<string>;
  ingestOptions: SharedIngestOptions;
  autoSummarizeImports: boolean;
  currentTaskId?: string;
  recordIngestedDocument: (
    document: Omit<StoredDocument, "id" | "sourceType">
  ) => StoredDocument;
  appendUiMessage: (
    text: string,
    sourceType?: DriveUiMessageSourceType
  ) => void;
  applyIngestUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
  focusGptPanel: () => boolean;
};

export async function runDriveFileImport({
  file,
  ensureAccessToken,
  ingestOptions,
  autoSummarizeImports,
  currentTaskId,
  recordIngestedDocument,
  appendUiMessage,
  applyIngestUsage,
  focusGptPanel,
}: RunDriveFileImportArgs) {
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
  let totalIngestUsage = normalizeUsage(data?.usage);
  if (!response.ok) {
    appendUiMessage(
      buildDriveImportFailedMessage({
        errorMessage: resolveIngestErrorMessage({
          data,
          fallback: `Failed to import ${file.name}.`,
        }),
      })
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
  const preparedDocument = await prepareIngestedStoredDocument({
    title,
    filename: title,
    text: storedText,
    taskId: currentTaskId,
    autoGenerateSummary: autoSummarizeImports,
    currentUsage: totalIngestUsage,
    fallbackSummary:
      autoSummarizeImports && rawTextForSummary
        ? buildDriveImportSummary({
            result: data?.result,
            fallbackText: rawTextForSummary,
            fallbackTitle: title,
          })
        : "",
    onSummaryError: (error) => {
      console.warn("Drive import summary generation failed", error);
    },
  });
  totalIngestUsage = preparedDocument.totalUsage;

  applyIngestUsage(totalIngestUsage);

  const storedDocument = preparedDocument.storedDocument;
  recordIngestedDocument(storedDocument);
  appendUiMessage(
    buildDriveImportSavedInfoMessage({
      title,
      storedDocumentCharCount: storedDocument.charCount,
    }),
    "file_ingest"
  );
  focusGptPanel();
}

export type RunDriveFolderImportArgs = {
  folder: DriveImportFolder;
  mode: DriveFolderImportMode;
  ensureAccessToken: () => Promise<string>;
  appendUiMessage: (
    text: string,
    sourceType?: DriveUiMessageSourceType
  ) => void;
  importDriveFile: (
    file: DriveFolderNode,
    options: { manageLoading?: boolean }
  ) => Promise<void>;
  focusGptPanel: () => boolean;
};

export async function runDriveFolderImport({
  folder,
  mode,
  ensureAccessToken,
  appendUiMessage,
  importDriveFile,
  focusGptPanel,
}: RunDriveFolderImportArgs) {
  const accessToken = await ensureAccessToken();
  const entries = await listDriveFolderChildren({
    accessToken,
    folderId: folder.id,
    currentPath: folder.name,
  });
  appendUiMessage(
    buildDriveFolderIndexMessage({
      folderName: folder.name,
      entries,
    })
  );
  focusGptPanel();
  if (mode === "index") return;

  const files = entries.filter((file) => canImportDriveMimeType(file.mimeType));
  for (const file of files) {
    await importDriveFile(file, { manageLoading: false });
  }
}

export type RunDriveLibraryItemUploadArgs = {
  item: ReferenceLibraryItem;
  folderId: string;
  ensureAccessToken: () => Promise<string>;
  promptForDestination: (message: string) => string | null;
  appendUiMessage: (
    text: string,
    sourceType?: DriveUiMessageSourceType
  ) => void;
  focusGptPanel: () => boolean;
};

export async function runDriveLibraryItemUpload({
  item,
  folderId,
  ensureAccessToken,
  promptForDestination,
  appendUiMessage,
  focusGptPanel,
}: RunDriveLibraryItemUploadArgs) {
  const accessToken = await ensureAccessToken();
  let destinationFolderId = folderId;
  let destinationFolderName = "configured folder";
  const childFolders = await listDriveChildFolders({
    accessToken,
    folderId,
  });

  if (childFolders.length > 0) {
    const selectionInput = promptForDestination(
      buildDriveUploadDestinationPrompt({
        childFolders,
      })
    );
    if (selectionInput === null) {
      appendUiMessage(buildDriveUploadCancelledMessage());
      focusGptPanel();
      return "cancelled" as const;
    }
    const selectionIndex = resolveDriveUploadDestinationIndex({
      input: selectionInput,
      childFolderCount: childFolders.length,
    });
    if (selectionIndex === null) {
      appendUiMessage(buildDriveUploadInvalidSelectionMessage());
      focusGptPanel();
      return "cancelled" as const;
    }
    if (selectionIndex >= 0) {
      const selectedFolder = childFolders[selectionIndex];
      destinationFolderId = selectedFolder.id;
      destinationFolderName = selectedFolder.name;
    }
  }

  const artifact = buildLibraryItemDriveExport(item);
  const uploaded = await uploadDriveTextFile({
    accessToken,
    folderId: destinationFolderId,
    fileName: artifact.fileName,
    text: artifact.text,
  });
  appendUiMessage(
    buildDriveUploadCompletedMessage({
      fileName: uploaded.name || artifact.fileName,
      destinationFolderName,
    })
  );
  focusGptPanel();
  return "uploaded" as const;
}
