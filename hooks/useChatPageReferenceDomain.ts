import { useGoogleDriveLibrary } from "@/hooks/useGoogleDriveLibrary";
import { useGoogleDrivePicker } from "@/hooks/useGoogleDrivePicker";
import { useMultipartAssemblies } from "@/hooks/useMultipartAssemblies";
import { useMultipartUiActions } from "@/hooks/useMultipartUiActions";
import { useReferenceLibrary } from "@/hooks/useReferenceLibrary";
import { useReferenceLibraryUiActions } from "@/hooks/useReferenceLibraryUiActions";
import { useStoredDocuments } from "@/hooks/useStoredDocuments";
import { useStoredDocumentUiActions } from "@/hooks/useStoredDocumentUiActions";
import type { TaskCharConstraint } from "@/lib/app/multipartAssemblyFlow";
import type { GptMemoryRuntime } from "@/lib/app/chatPageGptMemoryControls";
import type { SharedIngestOptions } from "@/lib/app/ingest/ingestClient";
import { normalizeUsage, type ConversationUsageOptions } from "@/lib/tokenStats";
import type { Message } from "@/types/chat";
import type { SearchContext } from "@/types/task";

type UseChatPageReferenceDomainArgs = {
  searchHistory: SearchContext[];
  searchHistoryStorageMB: number;
  sourceDisplayCount: number;
  uploadKind: SharedIngestOptions["kind"];
  ingestMode: SharedIngestOptions["mode"];
  imageDetail: SharedIngestOptions["detail"];
  fileReadPolicy: SharedIngestOptions["readPolicy"];
  compactCharLimit: number;
  simpleImageCharLimit: number;
  driveImportAutoSummary: boolean;
  currentTaskId?: string;
  currentTaskTitle?: string;
  currentKinDisplayLabel?: string | null;
  getCurrentTaskCharConstraint: () => TaskCharConstraint | null;
  setKinInput: React.Dispatch<React.SetStateAction<string>>;
  setGptInput: React.Dispatch<React.SetStateAction<string>>;
  gptMessages: Message[];
  setGptMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setIngestLoading: React.Dispatch<React.SetStateAction<boolean>>;
  gptMemoryRuntime: GptMemoryRuntime;
  applyChatUsage: (
    usage: Parameters<typeof normalizeUsage>[0],
    options?: ConversationUsageOptions
  ) => void;
  applyIngestUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
  applyCompressionUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
  focusGptPanel: () => boolean;
  focusKinPanel: () => boolean;
  setFinalizeReviewed: (params: { accepted: boolean; summary?: string }) => void;
};

export function useChatPageReferenceDomain(
  args: UseChatPageReferenceDomainArgs
) {
  const {
    multipartAssemblies,
    setMultipartAssemblies,
    deleteMultipartAssembly,
    loadMultipartAssemblyText,
    getMultipartAssembly,
    multipartStorageMB,
  } = useMultipartAssemblies();

  const {
    allDocuments,
    documentStorageMB,
    recordIngestedDocument,
    updateStoredDocument,
    deleteStoredDocument,
    moveStoredDocument,
    getStoredDocument,
  } = useStoredDocuments(multipartAssemblies);

  const {
    libraryItems,
    selectedTaskLibraryItemId,
    setSelectedTaskLibraryItemId,
    autoLibraryReferenceEnabled,
    setAutoLibraryReferenceEnabled,
    libraryReferenceMode,
    setLibraryReferenceMode,
    libraryIndexResponseCount,
    setLibraryIndexResponseCount,
    libraryReferenceCount,
    setLibraryReferenceCount,
    libraryStorageMB,
    setLibraryItemModeOverride,
    moveLibraryItem,
    getTaskLibraryItem,
    getLibraryItemById,
    buildLibraryReferenceContext,
    estimateLibraryReferenceTokens,
  } = useReferenceLibrary({
    storedDocuments: allDocuments,
    searchHistory: args.searchHistory,
    searchHistoryStorageMB: args.searchHistoryStorageMB,
    documentStorageMB,
    multipartStorageMB,
    sourceDisplayCount: args.sourceDisplayCount,
  });

  const {
    googleDriveFolderLink,
    setGoogleDriveFolderLink,
    googleDriveFolderId,
    openGoogleDriveFolder,
  } = useGoogleDriveLibrary();

  const {
    pickerReady: googleDrivePickerReady,
    openFileImportPicker,
    openFolderIndexPicker,
    openFolderImportPicker,
    uploadLibraryItemToDrive,
  } = useGoogleDrivePicker({
    folderLink: googleDriveFolderLink,
    setFolderLink: setGoogleDriveFolderLink,
    ingestOptions: {
      kind: args.uploadKind,
      mode: args.ingestMode,
      detail: args.imageDetail,
      readPolicy: args.fileReadPolicy,
      compactCharLimit: args.compactCharLimit,
      simpleImageCharLimit: args.simpleImageCharLimit,
    },
    autoSummarizeImports: args.driveImportAutoSummary,
    currentTaskId: args.currentTaskId,
    recordIngestedDocument,
    setGptMessages: args.setGptMessages,
    setIngestLoading: args.setIngestLoading,
    applyIngestUsage: args.applyIngestUsage,
    focusGptPanel: args.focusGptPanel,
  });

  const {
    processMultipartTaskDoneText,
    loadMultipartAssemblyToGptInput,
    downloadMultipartAssembly,
  } = useMultipartUiActions({
    multipartAssemblies,
    setMultipartAssemblies,
    currentTaskId: args.currentTaskId,
    currentTaskTitle: args.currentTaskTitle,
    currentKinLabel: args.currentKinDisplayLabel,
    getCurrentTaskCharConstraint: args.getCurrentTaskCharConstraint,
    setKinInput: args.setKinInput,
    setGptMessages: args.setGptMessages,
    setFinalizeReviewed: args.setFinalizeReviewed,
    focusGptPanel: args.focusGptPanel,
    loadMultipartAssemblyText,
    getMultipartAssembly,
    setGptInput: args.setGptInput,
  });

  const { loadStoredDocumentToGptInput, downloadStoredDocument } =
    useStoredDocumentUiActions({
      getStoredDocument,
      setGptInput: args.setGptInput,
      focusGptPanel: args.focusGptPanel,
    });

  const {
    showLibraryItemInChat,
    sendLibraryItemToKin,
    uploadLibraryItemToGoogleDrive,
    importGoogleDriveFile,
    indexGoogleDriveFolder,
    importGoogleDriveFolder,
  } = useReferenceLibraryUiActions({
    getLibraryItemById,
    gptMessages: args.gptMessages,
    setGptMessages: args.setGptMessages,
    setKinInput: args.setKinInput,
    focusGptPanel: args.focusGptPanel,
    focusKinPanel: args.focusKinPanel,
    gptMemoryRuntime: args.gptMemoryRuntime,
    applyChatUsage: args.applyChatUsage,
    applyCompressionUsage: args.applyCompressionUsage,
    openGoogleDriveFolder,
    importGoogleDriveFilePicker: openFileImportPicker,
    indexGoogleDriveFolderPicker: openFolderIndexPicker,
    importGoogleDriveFolderPicker: openFolderImportPicker,
    uploadLibraryItemToDrivePicker: uploadLibraryItemToDrive,
  });

  const libraryReferenceEstimatedTokens = estimateLibraryReferenceTokens();

  return {
    multipartAssemblies,
    deleteMultipartAssembly,
    allDocuments,
    recordIngestedDocument,
    updateStoredDocument,
    deleteStoredDocument,
    moveStoredDocument,
    libraryItems,
    selectedTaskLibraryItemId,
    setSelectedTaskLibraryItemId,
    autoLibraryReferenceEnabled,
    setAutoLibraryReferenceEnabled,
    libraryReferenceMode,
    setLibraryReferenceMode,
    libraryIndexResponseCount,
    setLibraryIndexResponseCount,
    libraryReferenceCount,
    setLibraryReferenceCount,
    libraryStorageMB,
    setLibraryItemModeOverride,
    moveLibraryItem,
    getTaskLibraryItem,
    buildLibraryReferenceContext,
    libraryReferenceEstimatedTokens,
    googleDriveFolderLink,
    setGoogleDriveFolderLink,
    googleDriveFolderId,
    googleDrivePickerReady,
    openGoogleDriveFolder,
    processMultipartTaskDoneText,
    loadMultipartAssemblyToGptInput,
    downloadMultipartAssembly,
    loadStoredDocumentToGptInput,
    downloadStoredDocument,
    showLibraryItemInChat,
    sendLibraryItemToKin,
    uploadLibraryItemToGoogleDrive,
    importGoogleDriveFile,
    indexGoogleDriveFolder,
    importGoogleDriveFolder,
  };
}

