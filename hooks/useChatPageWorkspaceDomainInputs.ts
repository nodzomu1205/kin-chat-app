import { useChatPageWorkspaceInputs } from "@/hooks/useChatPageWorkspaceInputs";
import { DEFAULT_CHAT_BRIDGE_SETTINGS } from "@/lib/app/ui-state/chatPageDefaults";
import type { useAutoBridgeSettings } from "@/hooks/useAutoBridgeSettings";
import type { useChatPageReferenceDomain } from "@/hooks/useChatPageReferenceDomain";
import type { useChatPageTaskProtocolDomain } from "@/hooks/useChatPageTaskProtocolDomain";
import type { useChatPageUiState } from "@/hooks/useChatPageUiState";
import type { useKinManager } from "@/hooks/useKinManager";
import type { usePersistedGptOptions } from "@/hooks/usePersistedGptOptions";
import type { useSearchHistory } from "@/hooks/useSearchHistory";
import type { useTaskDraftWorkspace } from "@/hooks/useTaskDraftWorkspace";
import type { useTokenTracking } from "@/hooks/useTokenTracking";

type ChatPageWorkspaceDomainInputsArgs = {
  chatUi: ReturnType<typeof useChatPageUiState>;
  taskDraftWorkspace: ReturnType<typeof useTaskDraftWorkspace>;
  gptOptions: ReturnType<typeof usePersistedGptOptions>;
  autoBridge: ReturnType<typeof useAutoBridgeSettings>;
  tokenUsage: ReturnType<typeof useTokenTracking>;
  kinManager: ReturnType<typeof useKinManager>;
  currentKinDisplayLabel: string | null;
  searchDomain: ReturnType<typeof useSearchHistory>;
  taskProtocolDomain: ReturnType<typeof useChatPageTaskProtocolDomain>;
  referenceDomain: ReturnType<typeof useChatPageReferenceDomain>;
};

export function useChatPageWorkspaceDomainInputs(
  args: ChatPageWorkspaceDomainInputsArgs
) {
  const {
    chatUi,
    taskDraftWorkspace,
    gptOptions,
    autoBridge,
    tokenUsage,
    kinManager,
    currentKinDisplayLabel,
    searchDomain,
    taskProtocolDomain,
    referenceDomain,
  } = args;

  return useChatPageWorkspaceInputs({
    app: {
      currentKin: kinManager.currentKin,
      currentKinLabel: currentKinDisplayLabel,
      kinStatus: kinManager.kinStatus,
      kinList: kinManager.kinList,
      isMobile: chatUi.isSinglePanelLayout,
      setActivePanelTab: chatUi.setActivePanelTab,
      focusKinPanel: chatUi.focusKinPanel,
      focusGptPanel: chatUi.focusGptPanel,
      setKinConnectionState: kinManager.setKinConnectionState,
    },
    ui: {
      gptInput: chatUi.gptInput,
      setGptInput: chatUi.setGptInput,
      kinInput: chatUi.kinInput,
      setKinInput: chatUi.setKinInput,
      gptLoading: chatUi.gptLoading,
      setGptLoading: chatUi.setGptLoading,
      kinLoading: chatUi.kinLoading,
      setKinLoading: chatUi.setKinLoading,
      ingestLoading: chatUi.ingestLoading,
      setIngestLoading: chatUi.setIngestLoading,
      gptMessages: chatUi.gptMessages,
      setGptMessages: chatUi.setGptMessages,
      kinMessages: chatUi.kinMessages,
      setKinMessages: chatUi.setKinMessages,
      pendingKinInjectionBlocks: chatUi.pendingKinInjectionBlocks,
      setPendingKinInjectionBlocks: chatUi.setPendingKinInjectionBlocks,
      pendingKinInjectionIndex: chatUi.pendingKinInjectionIndex,
      setPendingKinInjectionIndex: chatUi.setPendingKinInjectionIndex,
    },
    taskDraft: {
      currentTaskDraft: taskDraftWorkspace.currentTaskDraft,
      taskDraftCount: taskDraftWorkspace.taskDrafts.length,
      activeTaskDraftIndex: taskDraftWorkspace.activeTaskDraftIndex,
      setCurrentTaskDraft: taskDraftWorkspace.setCurrentTaskDraft,
      resetCurrentTaskDraft: taskProtocolDomain.resetCurrentTaskDraft,
      updateTaskDraftFields: taskProtocolDomain.updateTaskDraftFields,
      onSelectPreviousTaskDraft: taskDraftWorkspace.selectPreviousTaskDraft,
      onSelectNextTaskDraft: taskDraftWorkspace.selectNextTaskDraft,
    },
    task: {
      getTaskBaseText: taskProtocolDomain.getTaskBaseText,
      getResolvedTaskTitle: taskProtocolDomain.getResolvedTaskTitle,
      resolveTaskTitleFromDraft: taskProtocolDomain.resolveTaskTitleFromDraft,
      getTaskSlotLabel: taskProtocolDomain.getTaskSlotLabel,
      syncTaskDraftFromProtocol: taskProtocolDomain.syncTaskDraftFromProtocol,
      applyPrefixedTaskFieldsFromText:
        taskProtocolDomain.applyPrefixedTaskFieldsFromText,
      getCurrentTaskCharConstraint:
        taskProtocolDomain.getCurrentTaskCharConstraint,
      taskProtocol: taskProtocolDomain.taskProtocol,
      taskProtocolView: taskProtocolDomain.taskProtocolView,
    },
    protocol: {
      approvedIntentPhrases: taskProtocolDomain.approvedIntentPhrases,
      rejectedIntentCandidateSignatures:
        taskProtocolDomain.rejectedIntentCandidateSignatures,
      pendingIntentCandidates: taskProtocolDomain.pendingIntentCandidates,
      protocolPrompt: taskProtocolDomain.protocolPrompt,
      setPendingIntentCandidates: taskProtocolDomain.setPendingIntentCandidates,
      setApprovedIntentPhrases: taskProtocolDomain.setApprovedIntentPhrases,
      setRejectedIntentCandidateSignatures:
        taskProtocolDomain.setRejectedIntentCandidateSignatures,
      setProtocolPrompt: taskProtocolDomain.setProtocolPrompt,
      protocolRulebook: taskProtocolDomain.protocolRulebook,
      setProtocolRulebook: taskProtocolDomain.setProtocolRulebook,
      chatBridgeSettings: DEFAULT_CHAT_BRIDGE_SETTINGS,
    },
    search: {
      lastSearchContext: searchDomain.lastSearchContext,
      searchHistory: searchDomain.searchHistory,
      selectedTaskSearchResultId: searchDomain.selectedTaskSearchResultId,
      onSelectTaskSearchResult: searchDomain.setSelectedTaskSearchResultId,
      searchMode: searchDomain.searchMode,
      onChangeSearchMode: searchDomain.setSearchMode,
      searchEngines: searchDomain.searchEngines,
      onChangeSearchEngines: searchDomain.setSearchEngines,
      searchLocation: searchDomain.searchLocation,
      onChangeSearchLocation: searchDomain.setSearchLocation,
      sourceDisplayCount: searchDomain.sourceDisplayCount,
      onChangeSourceDisplayCount: searchDomain.setSourceDisplayCount,
      onMoveSearchHistoryItem: searchDomain.moveSearchHistoryItem,
      recordSearchContext: searchDomain.recordSearchContext,
      getContinuationTokenForSeries: searchDomain.getContinuationTokenForSeries,
      getAskAiModeLinkForQuery: searchDomain.getAskAiModeLinkForQuery,
      clearSearchHistory: searchDomain.clearSearchHistory,
      deleteSearchHistoryItemBase: searchDomain.deleteSearchHistoryItem,
      onDeleteSearchHistoryItem: taskProtocolDomain.deleteSearchHistoryItem,
      processMultipartTaskDoneText: referenceDomain.processMultipartTaskDoneText,
    },
    references: {
      multipartAssemblies: referenceDomain.multipartAssemblies,
      storedDocuments: referenceDomain.allDocuments,
      referenceLibraryItems: referenceDomain.libraryItems,
      selectedTaskLibraryItemId: referenceDomain.selectedTaskLibraryItemId,
      autoLibraryReferenceEnabled: referenceDomain.autoLibraryReferenceEnabled,
      libraryReferenceMode: referenceDomain.libraryReferenceMode,
      libraryIndexResponseCount: referenceDomain.libraryIndexResponseCount,
      libraryReferenceCount: referenceDomain.libraryReferenceCount,
      libraryStorageMB: referenceDomain.libraryStorageMB,
      libraryReferenceEstimatedTokens:
        referenceDomain.libraryReferenceEstimatedTokens,
      googleDriveFolderLink: referenceDomain.googleDriveFolderLink,
      googleDriveFolderId: referenceDomain.googleDriveFolderId,
      googleDriveIntegrationMode: referenceDomain.googleDrivePickerReady
        ? "picker"
        : "manual_link",
      onDeleteMultipartAssembly: referenceDomain.deleteMultipartAssembly,
      onLoadMultipartAssemblyToGptInput:
        referenceDomain.loadMultipartAssemblyToGptInput,
      onDownloadMultipartAssembly: referenceDomain.downloadMultipartAssembly,
      onLoadStoredDocumentToGptInput:
        referenceDomain.loadStoredDocumentToGptInput,
      onDownloadStoredDocument: referenceDomain.downloadStoredDocument,
      onDeleteStoredDocument: referenceDomain.deleteStoredDocument,
      onMoveStoredDocument: referenceDomain.moveStoredDocument,
      onMoveLibraryItem: referenceDomain.moveLibraryItem,
      onSelectTaskLibraryItem: referenceDomain.setSelectedTaskLibraryItemId,
      onChangeLibraryItemMode: referenceDomain.setLibraryItemModeOverride,
      onSaveStoredDocument: referenceDomain.updateStoredDocument,
      onShowLibraryItemInChat: referenceDomain.showLibraryItemInChat,
      onSendLibraryItemToKin: referenceDomain.sendLibraryItemToKin,
      onUploadLibraryItemToGoogleDrive:
        referenceDomain.uploadLibraryItemToGoogleDrive,
      onChangeAutoLibraryReferenceEnabled:
        referenceDomain.setAutoLibraryReferenceEnabled,
      onChangeLibraryReferenceMode: referenceDomain.setLibraryReferenceMode,
      onChangeLibraryIndexResponseCount:
        referenceDomain.setLibraryIndexResponseCount,
      onChangeLibraryReferenceCount: referenceDomain.setLibraryReferenceCount,
      onChangeGoogleDriveFolderLink: referenceDomain.setGoogleDriveFolderLink,
      onOpenGoogleDriveFolder: referenceDomain.openGoogleDriveFolder,
      onImportGoogleDriveFile: referenceDomain.importGoogleDriveFile,
      onIndexGoogleDriveFolder: referenceDomain.indexGoogleDriveFolder,
      onImportGoogleDriveFolder: referenceDomain.importGoogleDriveFolder,
      buildLibraryReferenceContext: referenceDomain.buildLibraryReferenceContext,
      getTaskLibraryItem: referenceDomain.getTaskLibraryItem,
    },
    gpt: {
      gptState: taskProtocolDomain.gptState,
      uploadKind: gptOptions.uploadKind,
      ingestMode: gptOptions.ingestMode,
      imageDetail: gptOptions.imageDetail,
      compactCharLimit: gptOptions.compactCharLimit,
      simpleImageCharLimit: gptOptions.simpleImageCharLimit,
      fileReadPolicy: gptOptions.fileReadPolicy,
      driveImportAutoSummary: gptOptions.driveImportAutoSummary,
      defaultMemorySettings: taskProtocolDomain.defaultMemorySettings,
      resetGptForCurrentKin: taskProtocolDomain.resetGptForCurrentKin,
      onChangeUploadKind: gptOptions.setUploadKind,
      onChangeIngestMode: gptOptions.setIngestMode,
      onChangeImageDetail: gptOptions.setImageDetail,
      onChangeCompactCharLimit: gptOptions.setCompactCharLimit,
      onChangeSimpleImageCharLimit: gptOptions.setSimpleImageCharLimit,
      onChangeFileReadPolicy: gptOptions.setFileReadPolicy,
      onChangeDriveImportAutoSummary: gptOptions.setDriveImportAutoSummary,
      gptMemoryRuntime: taskProtocolDomain.gptMemoryRuntime,
      gptMemorySettingsControls: taskProtocolDomain.gptMemorySettingsControls,
    },
    bridge: {
      autoBridgeSettings: autoBridge.autoBridgeSettings,
      updateAutoBridgeSettings: autoBridge.updateAutoBridgeSettings,
    },
    memory: {
      tokenStats: tokenUsage.tokenStats,
      memorySettings: taskProtocolDomain.memorySettings,
      memoryInterpreterSettings: taskProtocolDomain.memoryInterpreterSettings,
      pendingMemoryRuleCandidates: taskProtocolDomain.pendingMemoryRuleCandidates,
      approvedMemoryRules: taskProtocolDomain.approvedMemoryRules,
      onChangeMemoryInterpreterSettings:
        taskProtocolDomain.updateMemoryInterpreterSettings,
      onApproveMemoryRuleCandidate:
        taskProtocolDomain.approveMemoryRuleCandidate,
      onRejectMemoryRuleCandidate: taskProtocolDomain.rejectMemoryRuleCandidate,
      onUpdateMemoryRuleCandidate:
        taskProtocolDomain.updateMemoryRuleCandidate,
      onDeleteApprovedMemoryRule: taskProtocolDomain.deleteApprovedMemoryRule,
    },
    usage: {
      applySearchUsage: tokenUsage.applySearchUsage,
      applyChatUsage: tokenUsage.applyChatUsage,
      applyCompressionUsage: tokenUsage.applyCompressionUsage,
      applyTaskUsage: tokenUsage.applyTaskUsage,
      applyIngestUsage: tokenUsage.applyIngestUsage,
      recordIngestedDocument: referenceDomain.recordIngestedDocument,
    },
    kin: {
      kinIdInput: kinManager.kinIdInput,
      setKinIdInput: kinManager.setKinIdInput,
      kinNameInput: kinManager.kinNameInput,
      setKinNameInput: kinManager.setKinNameInput,
      renameKin: kinManager.renameKin,
      connectKin: kinManager.connectKin,
      switchKin: kinManager.switchKin,
      disconnectKin: kinManager.disconnectKin,
      removeKinState: taskProtocolDomain.removeKinState,
      removeKin: kinManager.removeKin,
    },
    resetTokenStats: tokenUsage.resetTokenStats,
  });
}
