import { useEffect } from "react";
import { useGoogleDriveLibrary } from "@/hooks/useGoogleDriveLibrary";
import { useGoogleDrivePicker } from "@/hooks/useGoogleDrivePicker";
import { useMultipartAssemblies } from "@/hooks/useMultipartAssemblies";
import { useMultipartUiActions } from "@/hooks/useMultipartUiActions";
import { useReferenceLibrary } from "@/hooks/useReferenceLibrary";
import { useReferenceLibraryUiActions } from "@/hooks/useReferenceLibraryUiActions";
import { useStoredDocuments } from "@/hooks/useStoredDocuments";
import { useStoredDocumentUiActions } from "@/hooks/useStoredDocumentUiActions";
import type { TaskCharConstraint } from "@/lib/app/multipart/multipartAssemblyFlow";
import type { GptMemoryRuntime } from "@/lib/app/ui-state/chatPageGptMemoryControls";
import type { PendingKinInjectionPurpose } from "@/lib/app/kin-protocol/kinMultipart";
import type { SharedIngestOptions } from "@/lib/app/ingest/ingestClient";
import {
  importImageFileToLibrary,
  type ImageImportSidecarText,
  type ImageLibraryImportMode,
} from "@/lib/app/image/imageImportFlow";
import { resolveLibraryCardLimitDeletionIds } from "@/lib/app/reference-library/libraryCardLimits";
import { normalizeUsage, type ConversationUsageOptions } from "@/lib/shared/tokenStats";
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
  imageLibraryImportEnabled: boolean;
  imageLibraryImportMode: ImageLibraryImportMode;
  compactCharLimit: number;
  simpleImageCharLimit: number;
  autoGenerateLibrarySummary: boolean;
  currentTaskId?: string;
  currentTaskTitle?: string;
  currentKinDisplayLabel?: string | null;
  getCurrentTaskCharConstraint: () => TaskCharConstraint | null;
  setKinInput: React.Dispatch<React.SetStateAction<string>>;
  setPendingKinInjectionBlocks: React.Dispatch<React.SetStateAction<string[]>>;
  setPendingKinInjectionIndex: React.Dispatch<React.SetStateAction<number>>;
  setPendingKinInjectionPurpose: React.Dispatch<
    React.SetStateAction<PendingKinInjectionPurpose>
  >;
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
  } = useStoredDocuments();

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
    imageLibraryReferenceEnabled,
    setImageLibraryReferenceEnabled,
    imageLibraryReferenceCount,
    setImageLibraryReferenceCount,
    imageLibraryCardLimit,
    setImageLibraryCardLimit,
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

  useEffect(() => {
    const deletionIds = resolveLibraryCardLimitDeletionIds({
      items: libraryItems,
      libraryCardLimit: libraryIndexResponseCount,
      imageLibraryCardLimit,
    });
    deletionIds.forEach(deleteStoredDocument);
  }, [
    deleteStoredDocument,
    imageLibraryCardLimit,
    libraryIndexResponseCount,
    libraryItems,
  ]);

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
    openImageFileImportPicker,
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
    autoGenerateLibrarySummary: args.autoGenerateLibrarySummary,
    currentTaskId: args.currentTaskId,
    recordIngestedDocument,
    setGptMessages: args.setGptMessages,
    setIngestLoading: args.setIngestLoading,
    applyIngestUsage: args.applyIngestUsage,
    focusGptPanel: args.focusGptPanel,
    imageLibraryImportEnabled: args.imageLibraryImportEnabled,
    imageLibraryImportMode: args.imageLibraryImportMode,
  });

  const imageIngestOptions: SharedIngestOptions = {
    kind: "image",
    mode: args.ingestMode,
    detail: args.imageDetail,
    readPolicy: args.fileReadPolicy,
    compactCharLimit: args.compactCharLimit,
    simpleImageCharLimit: args.simpleImageCharLimit,
  };

  const importDeviceImageFile = async (
    file: File,
    sidecarText?: ImageImportSidecarText
  ) => {
    args.setIngestLoading(true);
    try {
      const { payload } = await importImageFileToLibrary({
        file,
        sidecarText,
        imageLibraryImportEnabled: args.imageLibraryImportEnabled,
        mode: args.imageLibraryImportMode,
        ingestOptions: imageIngestOptions,
        autoGenerateLibrarySummary: args.autoGenerateLibrarySummary,
        currentTaskId: args.currentTaskId,
        recordIngestedDocument,
        applyIngestUsage: args.applyIngestUsage,
      });
      args.setGptMessages((prev) => [
        ...prev,
        {
          id: `image-import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          role: "gpt",
          text: [
            payload
              ? "Image imported to the image library."
              : "Image imported as text to the library.",
            "",
            ...(payload ? [`Image ID: ${payload.imageId}`] : []),
            `File: ${payload?.fileName || file.name}`,
          ].join("\n"),
        },
      ]);
      args.focusGptPanel();
    } finally {
      args.setIngestLoading(false);
    }
  };

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
    showAllLibraryItemsInChat,
    sendAllLibraryItemsToKin,
    uploadLibraryItemToGoogleDrive,
    renderPresentationPlanToPpt,
    importGoogleDriveFile,
    indexGoogleDriveFolder,
    importGoogleDriveFolder,
  } = useReferenceLibraryUiActions({
    libraryItems,
    getLibraryItemById,
    gptMessages: args.gptMessages,
    setGptMessages: args.setGptMessages,
    setKinInput: args.setKinInput,
    setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
    setPendingKinInjectionPurpose: args.setPendingKinInjectionPurpose,
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
    updateStoredDocument,
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
    imageLibraryReferenceEnabled,
    setImageLibraryReferenceEnabled,
    imageLibraryReferenceCount,
    setImageLibraryReferenceCount,
    imageLibraryCardLimit,
    setImageLibraryCardLimit,
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
    showAllLibraryItemsInChat,
    sendAllLibraryItemsToKin,
    uploadLibraryItemToGoogleDrive,
    renderPresentationPlanToPpt,
    importDeviceImageFile,
    importGoogleDriveFile,
    importGoogleDriveImageFile: openImageFileImportPicker,
    indexGoogleDriveFolder,
    importGoogleDriveFolder,
  };
}

