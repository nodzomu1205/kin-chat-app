import type { ChatPageControllerGroups } from "@/hooks/useChatPageController";
import type {
  ChatPageGptPanelCompositionArgs,
  ChatPageKinPanelCompositionArgs,
  ChatPageWorkspaceViewArgs,
} from "@/hooks/chatPagePanelCompositionTypes";

export function buildChatPagePanelBaseArgs(
  args: ChatPageWorkspaceViewArgs,
  controller: ChatPageControllerGroups
) {
  return {
    app: {
      currentKin: args.app.currentKin,
      currentKinLabel: args.app.currentKinLabel,
      kinStatus: args.app.kinStatus,
      kinList: args.app.kinList,
      isMobile: args.app.isMobile,
    },
    taskProtocolView: args.task.taskProtocolView,
    controller,
  };
}

export function buildChatPageWorkspaceGptReferences(
  args: ChatPageWorkspaceViewArgs
): ChatPageGptPanelCompositionArgs["references"] {
  return {
    lastSearchContext: args.search.lastSearchContext,
    searchHistory: args.search.searchHistory,
    selectedTaskSearchResultId: args.search.selectedTaskSearchResultId,
    multipartAssemblies: args.references.multipartAssemblies,
    storedDocuments: args.references.storedDocuments,
    referenceLibraryItems: args.references.referenceLibraryItems,
    selectedTaskLibraryItemId: args.references.selectedTaskLibraryItemId,
    onSelectTaskSearchResult: args.search.onSelectTaskSearchResult,
    onMoveSearchHistoryItem: args.search.onMoveSearchHistoryItem,
    onDeleteSearchHistoryItem: args.search.onDeleteSearchHistoryItem,
    onLoadMultipartAssemblyToGptInput:
      args.references.onLoadMultipartAssemblyToGptInput,
    onDownloadMultipartAssembly: args.references.onDownloadMultipartAssembly,
    onDeleteMultipartAssembly: args.references.onDeleteMultipartAssembly,
    onLoadStoredDocumentToGptInput:
      args.references.onLoadStoredDocumentToGptInput,
    onDownloadStoredDocument: args.references.onDownloadStoredDocument,
    onDeleteStoredDocument: args.references.onDeleteStoredDocument,
    onMoveStoredDocument: args.references.onMoveStoredDocument,
    onMoveLibraryItem: args.references.onMoveLibraryItem,
    onSelectTaskLibraryItem: args.references.onSelectTaskLibraryItem,
    onChangeLibraryItemMode: args.references.onChangeLibraryItemMode,
    onSaveStoredDocument: args.references.onSaveStoredDocument,
    onShowLibraryItemInChat: args.references.onShowLibraryItemInChat,
    onSendLibraryItemToKin: args.references.onSendLibraryItemToKin,
    onShowAllLibraryItemsInChat: args.references.onShowAllLibraryItemsInChat,
    onSendAllLibraryItemsToKin: args.references.onSendAllLibraryItemsToKin,
    onUploadLibraryItemToGoogleDrive:
      args.references.onUploadLibraryItemToGoogleDrive,
  };
}

export function buildChatPageWorkspaceKinState(
  args: ChatPageWorkspaceViewArgs
): ChatPageKinPanelCompositionArgs["kinState"] {
  return {
    kinIdInput: args.kin.kinIdInput,
    setKinIdInput: args.kin.setKinIdInput,
    kinNameInput: args.kin.kinNameInput,
    setKinNameInput: args.kin.setKinNameInput,
    currentKin: args.app.currentKin,
    kinMessages: args.ui.kinMessages,
    kinInput: args.ui.kinInput,
    setKinInput: args.ui.setKinInput,
    renameKin: args.kin.renameKin,
    kinBottomRef: args.ui.kinBottomRef,
    loading: args.ui.kinLoading,
    pendingInjectionBlocks: args.ui.pendingKinInjectionBlocks,
    pendingInjectionIndex: args.ui.pendingKinInjectionIndex,
  };
}

export function buildChatPageWorkspaceGptState(
  args: ChatPageWorkspaceViewArgs
): ChatPageGptPanelCompositionArgs["gptState"] {
  return {
    gptState: args.gpt.gptState,
    gptMessages: args.ui.gptMessages,
    gptInput: args.ui.gptInput,
    setGptInput: args.ui.setGptInput,
    gptBottomRef: args.ui.gptBottomRef,
    loading: args.ui.gptLoading,
    ingestLoading: args.ui.ingestLoading,
  };
}

export function buildChatPageWorkspaceGptTask(args: {
  workspace: ChatPageWorkspaceViewArgs;
  onSaveTaskSnapshot: () => void;
}): ChatPageGptPanelCompositionArgs["task"] {
  return {
    currentTaskDraft: args.workspace.task.currentTaskDraft,
    taskRegistrationDraft: args.workspace.task.taskRegistrationDraft,
    taskDraftCount: args.workspace.task.taskDraftCount,
    activeTaskDraftIndex: args.workspace.task.activeTaskDraftIndex,
    registeredTasks: args.workspace.task.registeredTasks,
    editingRegisteredTaskId: args.workspace.task.editingRegisteredTaskId,
    taskRegistrationLibrarySettings:
      args.workspace.task.taskRegistrationLibrarySettings,
    taskRegistrationRecurrence: args.workspace.task.taskRegistrationRecurrence,
    resetCurrentTaskDraft: args.workspace.task.resetCurrentTaskDraft,
    updateTaskDraftFields: args.workspace.task.updateTaskDraftFields,
    registerCurrentTaskDraft: args.workspace.task.registerCurrentTaskDraft,
    saveCurrentTaskDraftToRegisteredTask:
      args.workspace.task.saveCurrentTaskDraftToRegisteredTask,
    editRegisteredTask: args.workspace.task.editRegisteredTask,
    deleteRegisteredTask: args.workspace.task.deleteRegisteredTask,
    cancelTaskRegistrationEdit: args.workspace.task.cancelTaskRegistrationEdit,
    setTaskRegistrationLibrarySettings:
      args.workspace.task.setTaskRegistrationLibrarySettings,
    setTaskRegistrationRecurrence:
      args.workspace.task.setTaskRegistrationRecurrence,
    pendingRequests: args.workspace.task.taskProtocolView.pendingRequests,
    buildTaskRequestAnswerDraft: args.workspace.task.buildTaskRequestAnswerDraft,
    onSaveTaskSnapshot: args.onSaveTaskSnapshot,
    onSelectPreviousTaskDraft: args.workspace.task.onSelectPreviousTaskDraft,
    onSelectNextTaskDraft: args.workspace.task.onSelectNextTaskDraft,
  };
}

export function buildChatPageWorkspaceGptSettings(
  args: ChatPageWorkspaceViewArgs
): ChatPageGptPanelCompositionArgs["settings"] {
  return {
    memorySettings: args.memory.memorySettings,
    defaultMemorySettings: args.gpt.defaultMemorySettings,
    tokenStats: args.memory.tokenStats,
    uploadKind: args.gpt.uploadKind,
    ingestMode: args.gpt.ingestMode,
    imageDetail: args.gpt.imageDetail,
    fileReadPolicy: args.gpt.fileReadPolicy,
    autoGenerateLibrarySummary: args.gpt.autoGenerateLibrarySummary,
    compactCharLimit: args.gpt.compactCharLimit,
    simpleImageCharLimit: args.gpt.simpleImageCharLimit,
    ingestLoading: args.ui.ingestLoading,
    canInjectFile: !args.ui.gptLoading && !args.ui.ingestLoading,
    searchMode: args.search.searchMode,
    searchEngines: args.search.searchEngines,
    searchLocation: args.search.searchLocation,
    sourceDisplayCount: args.search.sourceDisplayCount,
    autoLibraryReferenceEnabled: args.references.autoLibraryReferenceEnabled,
    libraryReferenceMode: args.references.libraryReferenceMode,
    libraryIndexResponseCount: args.references.libraryIndexResponseCount,
    libraryReferenceCount: args.references.libraryReferenceCount,
    libraryStorageMB: args.references.libraryStorageMB,
    libraryReferenceEstimatedTokens:
      args.references.libraryReferenceEstimatedTokens,
    autoSendKinSysInput: args.bridge.autoBridgeSettings.autoSendKinSysInput,
    autoCopyKinSysResponseToGpt:
      args.bridge.autoBridgeSettings.autoCopyKinSysResponseToGpt,
    autoSendGptSysInput: args.bridge.autoBridgeSettings.autoSendGptSysInput,
    autoCopyGptSysResponseToKin:
      args.bridge.autoBridgeSettings.autoCopyGptSysResponseToKin,
    autoCopyFileIngestSysInfoToKin:
      args.bridge.autoBridgeSettings.autoCopyFileIngestSysInfoToKin,
    googleDriveFolderLink: args.references.googleDriveFolderLink,
    googleDriveFolderId: args.references.googleDriveFolderId,
    googleDriveIntegrationMode: args.references.googleDriveIntegrationMode,
    onChangeUploadKind: args.gpt.onChangeUploadKind,
    onChangeIngestMode: args.gpt.onChangeIngestMode,
    onChangeImageDetail: args.gpt.onChangeImageDetail,
    onChangeCompactCharLimit: args.gpt.onChangeCompactCharLimit,
    onChangeSimpleImageCharLimit: args.gpt.onChangeSimpleImageCharLimit,
    onChangeFileReadPolicy: args.gpt.onChangeFileReadPolicy,
    onChangeAutoGenerateLibrarySummary: args.gpt.onChangeAutoGenerateLibrarySummary,
    onChangeSearchMode: args.search.onChangeSearchMode,
    onChangeSearchEngines: args.search.onChangeSearchEngines,
    onChangeSearchLocation: args.search.onChangeSearchLocation,
    onChangeSourceDisplayCount: args.search.onChangeSourceDisplayCount,
    onChangeAutoLibraryReferenceEnabled:
      args.references.onChangeAutoLibraryReferenceEnabled,
    onChangeLibraryReferenceMode:
      args.references.onChangeLibraryReferenceMode,
    onChangeLibraryIndexResponseCount:
      args.references.onChangeLibraryIndexResponseCount,
    onChangeLibraryReferenceCount:
      args.references.onChangeLibraryReferenceCount,
    onChangeAutoSendKinSysInput: args.bridge.onChangeAutoSendKinSysInput,
    onChangeAutoCopyKinSysResponseToGpt:
      args.bridge.onChangeAutoCopyKinSysResponseToGpt,
    onChangeAutoSendGptSysInput: args.bridge.onChangeAutoSendGptSysInput,
    onChangeAutoCopyGptSysResponseToKin:
      args.bridge.onChangeAutoCopyGptSysResponseToKin,
    onChangeAutoCopyFileIngestSysInfoToKin:
      args.bridge.onChangeAutoCopyFileIngestSysInfoToKin,
    onChangeGoogleDriveFolderLink:
      args.references.onChangeGoogleDriveFolderLink,
    onOpenGoogleDriveFolder: args.references.onOpenGoogleDriveFolder,
    onImportGoogleDriveFile: args.references.onImportGoogleDriveFile,
    onIndexGoogleDriveFolder: args.references.onIndexGoogleDriveFolder,
    onImportGoogleDriveFolder: args.references.onImportGoogleDriveFolder,
    onChangeMemoryInterpreterSettings:
      args.memory.onChangeMemoryInterpreterSettings,
  };
}

export function buildChatPageWorkspaceProtocolState(
  args: ChatPageWorkspaceViewArgs
): ChatPageGptPanelCompositionArgs["protocolState"] {
  return {
    protocolPrompt: args.protocol.protocolPrompt,
    protocolRulebook: args.protocol.protocolRulebook,
    pendingIntentCandidates: args.protocol.pendingIntentCandidates,
    approvedIntentPhrases: args.protocol.approvedIntentPhrases,
    onChangeProtocolPrompt: args.protocol.onChangeProtocolPrompt,
    onChangeProtocolRulebook: args.protocol.onChangeProtocolRulebook,
  };
}

export function buildChatPageWorkspaceMemoryState(
  args: ChatPageWorkspaceViewArgs
): ChatPageGptPanelCompositionArgs["memoryState"] {
  return {
    memoryInterpreterSettings: args.memory.memoryInterpreterSettings,
    pendingMemoryRuleCandidates: args.memory.pendingMemoryRuleCandidates,
    approvedMemoryRules: args.memory.approvedMemoryRules,
    onApproveMemoryRuleCandidate: args.memory.onApproveMemoryRuleCandidate,
    onRejectMemoryRuleCandidate: args.memory.onRejectMemoryRuleCandidate,
    onUpdateMemoryRuleCandidate: args.memory.onUpdateMemoryRuleCandidate,
    onDeleteApprovedMemoryRule: args.memory.onDeleteApprovedMemoryRule,
  };
}
