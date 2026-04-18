"use client";

import { useRef, useState } from "react";
import ChatPanelsLayout from "@/components/ChatPanelsLayout";
import { useKinManager } from "@/hooks/useKinManager";
import { useGptMemory } from "@/hooks/useGptMemory";
import { usePanelLayout } from "@/hooks/usePanelLayout";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { usePersistedGptOptions } from "@/hooks/usePersistedGptOptions";
import { useAutoBridgeSettings } from "@/hooks/useAutoBridgeSettings";
import { useTokenTracking } from "@/hooks/useTokenTracking";
import {
  useSearchHistory,
} from "@/hooks/useSearchHistory";
import { useMultipartAssemblies } from "@/hooks/useMultipartAssemblies";
import { useStoredDocuments } from "@/hooks/useStoredDocuments";
import { useReferenceLibrary } from "@/hooks/useReferenceLibrary";
import { useGoogleDriveLibrary } from "@/hooks/useGoogleDriveLibrary";
import { useGoogleDrivePicker } from "@/hooks/useGoogleDrivePicker";
import { useMultipartUiActions } from "@/hooks/useMultipartUiActions";
import { useProtocolIntentSettings } from "@/hooks/useProtocolIntentSettings";
import { useMemoryInterpreterSettings } from "@/hooks/useMemoryInterpreterSettings";
import { useMemoryRuleActions } from "@/hooks/useMemoryRuleActions";
import { useChatPageLifecycle } from "@/hooks/useChatPageLifecycle";
import { useStoredDocumentUiActions } from "@/hooks/useStoredDocumentUiActions";
import { useTaskDraftHelpers } from "@/hooks/useTaskDraftHelpers";
import { useTaskDraftWorkspace } from "@/hooks/useTaskDraftWorkspace";
import { useTaskProtocolProjection } from "@/hooks/useTaskProtocolProjection";
import { useArchiveCompletedTaskResults } from "@/hooks/useArchiveCompletedTaskResults";
import { usePendingMemoryRuleQueue } from "@/hooks/usePendingMemoryRuleQueue";
import { useChatPagePanelsComposition } from "@/hooks/useChatPagePanelsComposition";
import { useReferenceLibraryUiActions } from "@/hooks/useReferenceLibraryUiActions";
import type { Message } from "@/types/chat";
import type { TaskCharConstraint } from "@/lib/app/multipartAssemblyFlow";
import { useKinTaskProtocol } from "@/hooks/useKinTaskProtocol";
import type { ChatBridgeSettings } from "@/types/taskProtocol";
import {
  buildTaskRequestAnswerDraft,
} from "@/lib/app/chatPageHelpers";
import { PROTOCOL_PROMPT_DEFAULT_KEY, PROTOCOL_RULEBOOK_DEFAULT_KEY } from "@/lib/app/chatPageStorageKeys";
import {
  buildChatPageGptMemoryRuntime,
  buildChatPageGptMemorySettingsControls,
} from "@/lib/app/chatPageGptMemoryControls";

const MOBILE_BREAKPOINT = 1180;

export default function ChatApp() {
  const [kinMessages, setKinMessages] = useState<Message[]>([]);
  const [gptMessages, setGptMessages] = useState<Message[]>([]);
  const [kinInput, setKinInput] = useState("");
  const [gptInput, setGptInput] = useState("");
  const [kinLoading, setKinLoading] = useState(false);
  const [gptLoading, setGptLoading] = useState(false);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [pendingKinInjectionBlocks, setPendingKinInjectionBlocks] = useState<
    string[]
  >([]);
  const [pendingKinInjectionIndex, setPendingKinInjectionIndex] = useState(0);
  const [, setCurrentSessionId] = useState<string | null>(null);
  const {
    isSinglePanelLayout,
    activePanelTab,
    setActivePanelTab,
    focusKinPanel,
    focusGptPanel,
  } = usePanelLayout(MOBILE_BREAKPOINT);
  const kinBottomRef = useRef<HTMLDivElement>(null);
  const gptBottomRef = useRef<HTMLDivElement>(null);
  const {
    taskDrafts,
    activeTaskDraftIndex,
    currentTaskDraft,
    setCurrentTaskDraft,
    selectPreviousTaskDraft,
    selectNextTaskDraft,
  } = useTaskDraftWorkspace();

  useAutoScroll(kinBottomRef, [kinMessages, kinLoading]);
  useAutoScroll(gptBottomRef, [gptMessages, gptLoading]);

  const {
    responseMode,
    setResponseMode,
    uploadKind,
    setUploadKind,
    ingestMode,
    setIngestMode,
    imageDetail,
    setImageDetail,
    compactCharLimit,
    setCompactCharLimit,
    simpleImageCharLimit,
    setSimpleImageCharLimit,
    postIngestAction,
    setPostIngestAction,
    fileReadPolicy,
    setFileReadPolicy,
    driveImportAutoSummary,
    setDriveImportAutoSummary,
  } = usePersistedGptOptions();
  const { autoBridgeSettings, updateAutoBridgeSettings } = useAutoBridgeSettings();
  const {
    memoryInterpreterSettings,
    setMemoryInterpreterSettings,
    pendingMemoryRuleCandidates,
    setPendingMemoryRuleCandidates,
    approvedMemoryRules,
    setApprovedMemoryRules,
    rejectedMemoryRuleCandidateSignatures,
    setRejectedMemoryRuleCandidateSignatures,
  } = useMemoryInterpreterSettings();

  const {
    tokenStats,
    applyChatUsage,
    applySummaryUsage,
    applySearchUsage,
    applyTaskUsage,
    applyIngestUsage,
    resetTokenStats,
  } = useTokenTracking();

  const {
    kinIdInput,
    setKinIdInput,
    kinNameInput,
    setKinNameInput,
    kinList,
    currentKin,
    kinStatus,
    setKinConnectionState,
    connectKin,
    switchKin,
    disconnectKin,
    removeKin,
    renameKin,
  } = useKinManager();
  const currentKinDisplayLabel =
    kinList.find((kin) => kin.id === currentKin)?.label ?? null;
  const { enqueuePendingMemoryRuleCandidates } = usePendingMemoryRuleQueue({
    approvedMemoryRules,
    setPendingMemoryRuleCandidates,
  });

  const {
    gptState,
    setGptState,
    gptStateRef,
    handleGptMemory,
    resetGptForCurrentKin,
    reapplyCurrentMemoryWithApprovedCandidate,
    reapplyCurrentMemoryWithRejectedCandidate,
    persistCurrentGptState,
    clearTaskScopedMemory,
    ensureKinState,
    removeKinState,
    chatRecentLimit,
    memorySettings,
    updateMemorySettings,
    resetMemorySettings,
    defaultMemorySettings,
  } = useGptMemory(currentKin, {
    memoryInterpreterSettings,
    approvedMemoryRules,
    rejectedMemoryRuleCandidateSignatures,
    onAddPendingMemoryRuleCandidates: enqueuePendingMemoryRuleCandidates,
  });
  const gptMemoryRuntime = buildChatPageGptMemoryRuntime({
    gptStateRef,
    setGptState,
    persistCurrentGptState,
    handleGptMemory,
    chatRecentLimit,
    clearTaskScopedMemory,
    resetGptForCurrentKin,
  });

  const {
    lastSearchContext,
    searchHistory,
    selectedTaskSearchResultId,
    setSelectedTaskSearchResultId,
    searchMode,
    setSearchMode,
    searchEngines,
    setSearchEngines,
    searchLocation,
    setSearchLocation,
    sourceDisplayCount,
    setSourceDisplayCount,
    moveSearchHistoryItem,
    recordSearchContext,
    getContinuationTokenForSeries,
    getAskAiModeLinkForQuery,
    clearSearchHistory,
    deleteSearchHistoryItem: deleteSearchHistoryItemBase,
    searchHistoryStorageMB,
  } = useSearchHistory();
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
      searchHistory,
      searchHistoryStorageMB,
      documentStorageMB,
    multipartStorageMB,
    sourceDisplayCount,
  });
  const {
    pendingIntentCandidates,
    setPendingIntentCandidates,
    approvedIntentPhrases,
    setApprovedIntentPhrases,
    rejectedIntentCandidateSignatures,
    setRejectedIntentCandidateSignatures,
    protocolPrompt,
    setProtocolPrompt,
    protocolRulebook,
    setProtocolRulebook,
  } = useProtocolIntentSettings();

  const taskProtocol = useKinTaskProtocol();
  const taskProtocolView = useTaskProtocolProjection(taskProtocol);

  const {
    updateMemoryInterpreterSettings,
    updateMemoryRuleCandidate,
    approveMemoryRuleCandidate,
    rejectMemoryRuleCandidate,
    deleteApprovedMemoryRule,
  } = useMemoryRuleActions({
    setMemoryInterpreterSettings,
    pendingMemoryRuleCandidates,
    approvedMemoryRules,
    setPendingMemoryRuleCandidates,
    setApprovedMemoryRules,
    setRejectedMemoryRuleCandidateSignatures,
    onApproveCandidateApplied: async (candidate, nextApprovedRules) => {
      await reapplyCurrentMemoryWithApprovedCandidate(
        candidate,
        nextApprovedRules
      );
    },
    onRejectCandidateApplied: async (candidate, nextRejectedSignatures) => {
      await reapplyCurrentMemoryWithRejectedCandidate(
        candidate,
        nextRejectedSignatures
      );
    },
  });

  const [chatBridgeSettings] = useState<ChatBridgeSettings>({
    injectTaskContextOnReference: true,
    alwaysShowCurrentTaskInChatContext: false,
  });

  useChatPageLifecycle({
    currentKin,
    ensureKinState,
    setCurrentSessionId,
  });

  const libraryReferenceEstimatedTokens = estimateLibraryReferenceTokens();

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
      kind: uploadKind,
      mode: ingestMode,
      detail: imageDetail,
      readPolicy: fileReadPolicy,
      compactCharLimit,
      simpleImageCharLimit,
    },
    autoSummarizeImports: driveImportAutoSummary,
    currentTaskId: currentTaskDraft.id || undefined,
    recordIngestedDocument,
    setGptMessages,
    applyIngestUsage,
    applySummaryUsage,
    focusGptPanel,
  });
  const {
    deleteSearchHistoryItem,
    resetCurrentTaskDraft,
    getCurrentTaskCharConstraint,
    updateTaskDraftFields,
    applyPrefixedTaskFieldsFromText,
    getTaskSlotLabel,
    getResolvedTaskTitle,
    resolveTaskTitleFromDraft,
    getTaskBaseText,
    syncTaskDraftFromProtocol,
  } = useTaskDraftHelpers({
    currentTaskDraft,
    gptMessages,
    setCurrentTaskDraft,
    resetTaskProtocolRuntime: taskProtocolView.resetRuntime,
    clearTaskScopedMemory: gptMemoryRuntime.clearTaskScopedMemory,
    deleteSearchHistoryItemBase,
    currentTaskIntentConstraints: taskProtocolView.currentTaskIntentConstraints,
  });

  const {
    processMultipartTaskDoneText,
    loadMultipartAssemblyToGptInput,
    downloadMultipartAssembly,
  } = useMultipartUiActions({
    multipartAssemblies,
    setMultipartAssemblies,
    currentTaskId: taskProtocolView.currentTaskId,
    currentTaskTitle: taskProtocolView.currentTaskTitle,
    currentKinLabel: currentKinDisplayLabel,
    getCurrentTaskCharConstraint: () =>
      getCurrentTaskCharConstraint() as TaskCharConstraint | null,
    setKinInput,
    setGptMessages,
    setFinalizeReviewed: taskProtocolView.setFinalizeReviewed,
    focusGptPanel,
    loadMultipartAssemblyText,
    getMultipartAssembly,
    setGptInput,
  });

  const { loadStoredDocumentToGptInput, downloadStoredDocument } =
    useStoredDocumentUiActions({
      getStoredDocument,
      setGptInput,
      focusGptPanel,
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
    setGptMessages,
    setKinInput,
    focusGptPanel,
    focusKinPanel,
    openGoogleDriveFolder,
    importGoogleDriveFilePicker: openFileImportPicker,
    indexGoogleDriveFolderPicker: openFolderIndexPicker,
    importGoogleDriveFolderPicker: openFolderImportPicker,
    uploadLibraryItemToDrivePicker: uploadLibraryItemToDrive,
  });

  useArchiveCompletedTaskResults({
    documents: allDocuments,
    progressViews: taskProtocolView.progressViews,
    archiveTask: taskProtocolView.onClearTaskProgress,
  });

  const gptMemorySettingsControls = buildChatPageGptMemorySettingsControls({
    updateMemorySettings,
    resetMemorySettings,
  });

  const workspaceState = {
    app: {
      currentKin,
      currentKinLabel: currentKinDisplayLabel,
      kinStatus,
      kinList,
      isMobile: isSinglePanelLayout,
    },
    ui: {
      gptInput,
      kinInput,
      gptLoading,
      kinLoading,
      ingestLoading,
      gptMessages,
      kinMessages,
      pendingKinInjectionBlocks,
      pendingKinInjectionIndex,
    },
    task: {
      currentTaskDraft,
      taskDraftCount: taskDrafts.length,
      activeTaskDraftIndex,
    },
    protocol: {
      approvedIntentPhrases,
      rejectedIntentCandidateSignatures,
      pendingIntentCandidates,
      protocolPrompt,
      protocolRulebook,
    },
    search: {
      lastSearchContext,
      searchHistory,
      selectedTaskSearchResultId,
      searchMode,
      searchEngines,
      searchLocation,
      sourceDisplayCount,
    },
    references: {
      multipartAssemblies,
      storedDocuments: allDocuments,
      referenceLibraryItems: libraryItems,
      selectedTaskLibraryItemId,
      autoLibraryReferenceEnabled,
      libraryReferenceMode,
      libraryIndexResponseCount,
      libraryReferenceCount,
      libraryStorageMB,
      libraryReferenceEstimatedTokens,
      googleDriveFolderLink,
      googleDriveFolderId,
      googleDriveIntegrationMode: googleDrivePickerReady ? "picker" : "manual_link",
    },
    gpt: {
      gptState,
      responseMode,
      uploadKind,
      ingestMode,
      imageDetail,
      compactCharLimit,
      simpleImageCharLimit,
      postIngestAction,
      fileReadPolicy,
      driveImportAutoSummary,
      defaultMemorySettings,
    },
    bridge: {
      autoBridgeSettings,
    },
    memory: {
      tokenStats,
      memorySettings,
      memoryInterpreterSettings,
      pendingMemoryRuleCandidates,
      approvedMemoryRules,
    },
    usage: {
      applySearchUsage,
      applyChatUsage,
      applySummaryUsage,
      applyTaskUsage,
      applyIngestUsage,
      recordIngestedDocument,
    },
    kin: {
      kinIdInput,
      kinNameInput,
    },
  } as const;

  const workspaceActions = {
    app: {
      setActivePanelTab,
      focusKinPanel,
      focusGptPanel,
      setKinConnectionState,
    },
    ui: {
      setKinInput,
      setGptInput,
      setKinMessages,
      setGptMessages,
      setKinLoading,
      setGptLoading,
      setIngestLoading,
      setPendingKinInjectionBlocks,
      setPendingKinInjectionIndex,
    },
    task: {
      setCurrentTaskDraft,
      resetCurrentTaskDraft,
      updateTaskDraftFields,
      buildTaskRequestAnswerDraft,
      onSelectPreviousTaskDraft: selectPreviousTaskDraft,
      onSelectNextTaskDraft: selectNextTaskDraft,
    },
    protocol: {
      setPendingIntentCandidates,
      setApprovedIntentPhrases,
      setRejectedIntentCandidateSignatures,
      setProtocolPrompt,
      setProtocolRulebook,
      onChangeProtocolPrompt: setProtocolPrompt,
      onChangeProtocolRulebook: setProtocolRulebook,
    },
    search: {
      clearSearchHistory,
      deleteSearchHistoryItemBase,
      onMoveSearchHistoryItem: moveSearchHistoryItem,
      onSelectTaskSearchResult: setSelectedTaskSearchResultId,
      onDeleteSearchHistoryItem: deleteSearchHistoryItem,
      onChangeSearchMode: setSearchMode,
      onChangeSearchEngines: setSearchEngines,
      onChangeSearchLocation: setSearchLocation,
      onChangeSourceDisplayCount: setSourceDisplayCount,
    },
    references: {
      onDeleteMultipartAssembly: deleteMultipartAssembly,
      onLoadMultipartAssemblyToGptInput: loadMultipartAssemblyToGptInput,
      onDownloadMultipartAssembly: downloadMultipartAssembly,
      onLoadStoredDocumentToGptInput: loadStoredDocumentToGptInput,
      onDownloadStoredDocument: downloadStoredDocument,
      onDeleteStoredDocument: deleteStoredDocument,
      onMoveStoredDocument: moveStoredDocument,
      onMoveLibraryItem: moveLibraryItem,
      onSelectTaskLibraryItem: setSelectedTaskLibraryItemId,
      onChangeLibraryItemMode: setLibraryItemModeOverride,
      onSaveStoredDocument: updateStoredDocument,
      onShowLibraryItemInChat: showLibraryItemInChat,
      onSendLibraryItemToKin: sendLibraryItemToKin,
      onUploadLibraryItemToGoogleDrive: uploadLibraryItemToGoogleDrive,
      onChangeAutoLibraryReferenceEnabled: setAutoLibraryReferenceEnabled,
      onChangeLibraryReferenceMode: setLibraryReferenceMode,
      onChangeLibraryIndexResponseCount: setLibraryIndexResponseCount,
      onChangeLibraryReferenceCount: setLibraryReferenceCount,
      onChangeGoogleDriveFolderLink: setGoogleDriveFolderLink,
      onOpenGoogleDriveFolder: openGoogleDriveFolder,
      onImportGoogleDriveFile: importGoogleDriveFile,
      onIndexGoogleDriveFolder: indexGoogleDriveFolder,
      onImportGoogleDriveFolder: importGoogleDriveFolder,
    },
    gpt: {
      resetGptForCurrentKin,
      onChangeResponseMode: setResponseMode,
      onChangeUploadKind: setUploadKind,
      onChangeIngestMode: setIngestMode,
      onChangeImageDetail: setImageDetail,
      onChangeCompactCharLimit: setCompactCharLimit,
      onChangeSimpleImageCharLimit: setSimpleImageCharLimit,
      onChangePostIngestAction: setPostIngestAction,
      onChangeFileReadPolicy: setFileReadPolicy,
      onChangeDriveImportAutoSummary: setDriveImportAutoSummary,
    },
    bridge: {
      onChangeAutoSendKinSysInput: (value: boolean) =>
        updateAutoBridgeSettings({ autoSendKinSysInput: value }),
      onChangeAutoCopyKinSysResponseToGpt: (value: boolean) =>
        updateAutoBridgeSettings({ autoCopyKinSysResponseToGpt: value }),
      onChangeAutoSendGptSysInput: (value: boolean) =>
        updateAutoBridgeSettings({ autoSendGptSysInput: value }),
      onChangeAutoCopyGptSysResponseToKin: (value: boolean) =>
        updateAutoBridgeSettings({ autoCopyGptSysResponseToKin: value }),
      onChangeAutoCopyFileIngestSysInfoToKin: (value: boolean) =>
        updateAutoBridgeSettings({ autoCopyFileIngestSysInfoToKin: value }),
    },
    memory: {
      onChangeMemoryInterpreterSettings: updateMemoryInterpreterSettings,
      onApproveMemoryRuleCandidate: approveMemoryRuleCandidate,
      onRejectMemoryRuleCandidate: rejectMemoryRuleCandidate,
      onUpdateMemoryRuleCandidate: updateMemoryRuleCandidate,
      onDeleteApprovedMemoryRule: deleteApprovedMemoryRule,
    },
    kin: {
      setKinIdInput,
      setKinNameInput,
      renameKin,
    },
    reset: {
      resetTokenStats,
      connectKin,
      switchKin,
      disconnectKin,
      removeKinState,
      removeKin,
    },
  } as const;

  const workspaceServices = {
    task: {
      getTaskBaseText,
      getTaskLibraryItem,
      getResolvedTaskTitle,
      resolveTaskTitleFromDraft,
      getTaskSlotLabel,
      syncTaskDraftFromProtocol,
      applyPrefixedTaskFieldsFromText,
      getCurrentTaskCharConstraint,
      taskProtocol,
      taskProtocolView,
    },
    protocol: {
      chatBridgeSettings,
      promptDefaultKey: PROTOCOL_PROMPT_DEFAULT_KEY,
      rulebookDefaultKey: PROTOCOL_RULEBOOK_DEFAULT_KEY,
    },
    search: {
      processMultipartTaskDoneText,
      recordSearchContext,
      getContinuationTokenForSeries,
      getAskAiModeLinkForQuery,
    },
    references: {
      buildLibraryReferenceContext,
    },
    gpt: {
      gptMemoryRuntime,
      gptMemorySettingsControls,
    },
    usage: {
      applySearchUsage,
      applyChatUsage,
      applySummaryUsage,
      applyTaskUsage,
      applyIngestUsage,
      recordIngestedDocument,
    },
    autoGenerateFileImportSummary: driveImportAutoSummary,
  } as const;

  const { kinPanel, gptPanel } = useChatPagePanelsComposition({
    input: {
      state: workspaceState,
      actions: workspaceActions,
      services: workspaceServices,
    },
    kinBottomRef,
    gptBottomRef,
  });

  return (
    <div
      style={{
        height: "100dvh",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#ffffff",
        backgroundPosition: "top left",
        overflow: "visible",
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          gap: isSinglePanelLayout ? 0 : 12,
          padding: isSinglePanelLayout ? 0 : 12,
          overflow: "visible",
        }}
      >
        <ChatPanelsLayout
          isSinglePanelLayout={isSinglePanelLayout}
          activePanelTab={activePanelTab}
          kinPanel={kinPanel}
          gptPanel={gptPanel}
        />
      </div>
    </div>
  );
}
