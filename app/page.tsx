"use client";

import { useState } from "react";
import ChatPanelsLayout from "@/components/ChatPanelsLayout";
import { useKinManager } from "@/hooks/useKinManager";
import { usePersistedGptOptions } from "@/hooks/usePersistedGptOptions";
import { useAutoBridgeSettings } from "@/hooks/useAutoBridgeSettings";
import { useTokenTracking } from "@/hooks/useTokenTracking";
import {
  useSearchHistory,
} from "@/hooks/useSearchHistory";
import { useChatPageLifecycle } from "@/hooks/useChatPageLifecycle";
import { useTaskDraftWorkspace } from "@/hooks/useTaskDraftWorkspace";
import { useArchiveCompletedTaskResults } from "@/hooks/useArchiveCompletedTaskResults";
import { useChatPagePanelsComposition } from "@/hooks/useChatPagePanelsComposition";
import { useChatPageReferenceDomain } from "@/hooks/useChatPageReferenceDomain";
import { useChatPageTaskProtocolDomain } from "@/hooks/useChatPageTaskProtocolDomain";
import { useChatPageUiState } from "@/hooks/useChatPageUiState";
import { useChatPageWorkspaceInputs } from "@/hooks/useChatPageWorkspaceInputs";
import type { TaskCharConstraint } from "@/lib/app/multipartAssemblyFlow";
import type { ChatBridgeSettings } from "@/types/taskProtocol";

const MOBILE_BREAKPOINT = 1180;

export default function ChatApp() {
  const {
    kinMessages,
    setKinMessages,
    gptMessages,
    setGptMessages,
    kinInput,
    setKinInput,
    gptInput,
    setGptInput,
    kinLoading,
    setKinLoading,
    gptLoading,
    setGptLoading,
    ingestLoading,
    setIngestLoading,
    pendingKinInjectionBlocks,
    setPendingKinInjectionBlocks,
    pendingKinInjectionIndex,
    setPendingKinInjectionIndex,
    setCurrentSessionId,
    isSinglePanelLayout,
    activePanelTab,
    setActivePanelTab,
    focusKinPanel,
    focusGptPanel,
    kinBottomRef,
    gptBottomRef,
  } = useChatPageUiState(MOBILE_BREAKPOINT);
  const {
    taskDrafts,
    activeTaskDraftIndex,
    currentTaskDraft,
    setCurrentTaskDraft,
    selectPreviousTaskDraft,
    selectNextTaskDraft,
  } = useTaskDraftWorkspace();

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
    memoryInterpreterSettings,
    pendingMemoryRuleCandidates,
    approvedMemoryRules,
    gptState,
    resetGptForCurrentKin,
    ensureKinState,
    removeKinState,
    memorySettings,
    defaultMemorySettings,
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
    taskProtocol,
    taskProtocolView,
    updateMemoryInterpreterSettings,
    updateMemoryRuleCandidate,
    approveMemoryRuleCandidate,
    rejectMemoryRuleCandidate,
    deleteApprovedMemoryRule,
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
    gptMemoryRuntime,
    gptMemorySettingsControls,
  } = useChatPageTaskProtocolDomain({
    currentKin,
    currentTaskDraft,
    gptMessages,
    setCurrentTaskDraft,
    deleteSearchHistoryItemBase,
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

  const {
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
    openGoogleDriveFolder,
  } = useChatPageReferenceDomain({
    searchHistory,
    searchHistoryStorageMB,
    sourceDisplayCount,
    uploadKind,
    ingestMode,
    imageDetail,
    fileReadPolicy,
    compactCharLimit,
    simpleImageCharLimit,
    driveImportAutoSummary,
    currentTaskId: currentTaskDraft.id || undefined,
    currentTaskTitle: taskProtocolView.currentTaskTitle,
    currentKinDisplayLabel,
    getCurrentTaskCharConstraint: () =>
      getCurrentTaskCharConstraint() as TaskCharConstraint | null,
    setKinInput,
    setGptInput,
    setGptMessages,
    applyIngestUsage,
    applySummaryUsage,
    focusGptPanel,
    focusKinPanel,
    setFinalizeReviewed: taskProtocolView.setFinalizeReviewed,
  });

  useArchiveCompletedTaskResults({
    documents: allDocuments,
    progressViews: taskProtocolView.progressViews,
    archiveTask: taskProtocolView.onClearTaskProgress,
  });

  const { workspaceState, workspaceActions, workspaceServices } =
    useChatPageWorkspaceInputs({
      app: {
        currentKin,
        currentKinLabel: currentKinDisplayLabel,
        kinStatus,
        kinList,
        isMobile: isSinglePanelLayout,
        setActivePanelTab,
        focusKinPanel,
        focusGptPanel,
        setKinConnectionState,
      },
      ui: {
        gptInput,
        setGptInput,
        kinInput,
        setKinInput,
        gptLoading,
        setGptLoading,
        kinLoading,
        setKinLoading,
        ingestLoading,
        setIngestLoading,
        gptMessages,
        setGptMessages,
        kinMessages,
        setKinMessages,
        pendingKinInjectionBlocks,
        setPendingKinInjectionBlocks,
        pendingKinInjectionIndex,
        setPendingKinInjectionIndex,
      },
      taskDraft: {
        currentTaskDraft,
        taskDraftCount: taskDrafts.length,
        activeTaskDraftIndex,
        setCurrentTaskDraft,
        resetCurrentTaskDraft,
        updateTaskDraftFields,
        onSelectPreviousTaskDraft: selectPreviousTaskDraft,
        onSelectNextTaskDraft: selectNextTaskDraft,
      },
      task: {
        getTaskBaseText,
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
        approvedIntentPhrases,
        rejectedIntentCandidateSignatures,
        pendingIntentCandidates,
        protocolPrompt,
        setPendingIntentCandidates,
        setApprovedIntentPhrases,
        setRejectedIntentCandidateSignatures,
        setProtocolPrompt,
        protocolRulebook,
        setProtocolRulebook,
        chatBridgeSettings,
      },
      search: {
        lastSearchContext,
        searchHistory,
        selectedTaskSearchResultId,
        onSelectTaskSearchResult: setSelectedTaskSearchResultId,
        searchMode,
        onChangeSearchMode: setSearchMode,
        searchEngines,
        onChangeSearchEngines: setSearchEngines,
        searchLocation,
        onChangeSearchLocation: setSearchLocation,
        sourceDisplayCount,
        onChangeSourceDisplayCount: setSourceDisplayCount,
        onMoveSearchHistoryItem: moveSearchHistoryItem,
        recordSearchContext,
        getContinuationTokenForSeries,
        getAskAiModeLinkForQuery,
        clearSearchHistory,
        deleteSearchHistoryItemBase,
        onDeleteSearchHistoryItem: deleteSearchHistoryItem,
        processMultipartTaskDoneText,
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
        googleDriveIntegrationMode: googleDrivePickerReady
          ? "picker"
          : "manual_link",
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
        buildLibraryReferenceContext,
        getTaskLibraryItem,
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
        gptMemoryRuntime,
        gptMemorySettingsControls,
      },
      bridge: {
        autoBridgeSettings,
        updateAutoBridgeSettings,
      },
      memory: {
        tokenStats,
        memorySettings,
        memoryInterpreterSettings,
        pendingMemoryRuleCandidates,
        approvedMemoryRules,
        onChangeMemoryInterpreterSettings: updateMemoryInterpreterSettings,
        onApproveMemoryRuleCandidate: approveMemoryRuleCandidate,
        onRejectMemoryRuleCandidate: rejectMemoryRuleCandidate,
        onUpdateMemoryRuleCandidate: updateMemoryRuleCandidate,
        onDeleteApprovedMemoryRule: deleteApprovedMemoryRule,
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
        setKinIdInput,
        kinNameInput,
        setKinNameInput,
        renameKin,
        connectKin,
        switchKin,
        disconnectKin,
        removeKinState,
        removeKin,
      },
      resetTokenStats,
    });

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
