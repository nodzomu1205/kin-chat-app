import type {
  ChatPageWorkspaceActionsApp,
  ChatPageWorkspaceActionsBridge,
  ChatPageWorkspaceActionsGpt,
  ChatPageWorkspaceActionsKin,
  ChatPageWorkspaceActionsMemory,
  ChatPageWorkspaceActionsProtocol,
  ChatPageWorkspaceActionsReferences,
  ChatPageWorkspaceActionsReset,
  ChatPageWorkspaceActionsSearch,
  ChatPageWorkspaceActionsTask,
  ChatPageWorkspaceActionsUi,
  ChatPageWorkspaceCompositionActions,
} from "@/hooks/chatPageWorkspaceCompositionTypes";

function buildWorkspaceActionsApp(args: ChatPageWorkspaceActionsApp) {
  return {
    setActivePanelTab: args.setActivePanelTab,
    focusKinPanel: args.focusKinPanel,
    focusGptPanel: args.focusGptPanel,
    setKinConnectionState: args.setKinConnectionState,
  } satisfies ChatPageWorkspaceActionsApp;
}

function buildWorkspaceActionsUi(args: ChatPageWorkspaceActionsUi) {
  return {
    setKinInput: args.setKinInput,
    setGptInput: args.setGptInput,
    setKinMessages: args.setKinMessages,
    setGptMessages: args.setGptMessages,
    setKinLoading: args.setKinLoading,
    setGptLoading: args.setGptLoading,
    setIngestLoading: args.setIngestLoading,
    setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
  } satisfies ChatPageWorkspaceActionsUi;
}

function buildWorkspaceActionsTask(args: ChatPageWorkspaceActionsTask) {
  return {
    setCurrentTaskDraft: args.setCurrentTaskDraft,
    resetCurrentTaskDraft: args.resetCurrentTaskDraft,
    updateTaskDraftFields: args.updateTaskDraftFields,
    buildTaskRequestAnswerDraft: args.buildTaskRequestAnswerDraft,
    onSelectPreviousTaskDraft: args.onSelectPreviousTaskDraft,
    onSelectNextTaskDraft: args.onSelectNextTaskDraft,
  } satisfies ChatPageWorkspaceActionsTask;
}

function buildWorkspaceActionsProtocol(args: ChatPageWorkspaceActionsProtocol) {
  return {
    setPendingIntentCandidates: args.setPendingIntentCandidates,
    setApprovedIntentPhrases: args.setApprovedIntentPhrases,
    setRejectedIntentCandidateSignatures: args.setRejectedIntentCandidateSignatures,
    setProtocolPrompt: args.setProtocolPrompt,
    setProtocolRulebook: args.setProtocolRulebook,
    onChangeProtocolPrompt: args.onChangeProtocolPrompt,
    onChangeProtocolRulebook: args.onChangeProtocolRulebook,
  } satisfies ChatPageWorkspaceActionsProtocol;
}

function buildWorkspaceActionsSearch(args: ChatPageWorkspaceActionsSearch) {
  return {
    clearSearchHistory: args.clearSearchHistory,
    deleteSearchHistoryItemBase: args.deleteSearchHistoryItemBase,
    onMoveSearchHistoryItem: args.onMoveSearchHistoryItem,
    onSelectTaskSearchResult: args.onSelectTaskSearchResult,
    onDeleteSearchHistoryItem: args.onDeleteSearchHistoryItem,
    onChangeSearchMode: args.onChangeSearchMode,
    onChangeSearchEngines: args.onChangeSearchEngines,
    onChangeSearchLocation: args.onChangeSearchLocation,
    onChangeSourceDisplayCount: args.onChangeSourceDisplayCount,
  } satisfies ChatPageWorkspaceActionsSearch;
}

function buildWorkspaceActionsReferences(args: ChatPageWorkspaceActionsReferences) {
  return {
    onDeleteMultipartAssembly: args.onDeleteMultipartAssembly,
    onLoadMultipartAssemblyToGptInput: args.onLoadMultipartAssemblyToGptInput,
    onDownloadMultipartAssembly: args.onDownloadMultipartAssembly,
    onLoadStoredDocumentToGptInput: args.onLoadStoredDocumentToGptInput,
    onDownloadStoredDocument: args.onDownloadStoredDocument,
    onDeleteStoredDocument: args.onDeleteStoredDocument,
    onMoveStoredDocument: args.onMoveStoredDocument,
    onMoveLibraryItem: args.onMoveLibraryItem,
    onSelectTaskLibraryItem: args.onSelectTaskLibraryItem,
    onChangeLibraryItemMode: args.onChangeLibraryItemMode,
    onSaveStoredDocument: args.onSaveStoredDocument,
    onShowLibraryItemInChat: args.onShowLibraryItemInChat,
    onSendLibraryItemToKin: args.onSendLibraryItemToKin,
    onUploadLibraryItemToGoogleDrive: args.onUploadLibraryItemToGoogleDrive,
    onChangeAutoLibraryReferenceEnabled: args.onChangeAutoLibraryReferenceEnabled,
    onChangeLibraryReferenceMode: args.onChangeLibraryReferenceMode,
    onChangeLibraryIndexResponseCount: args.onChangeLibraryIndexResponseCount,
    onChangeLibraryReferenceCount: args.onChangeLibraryReferenceCount,
    onChangeGoogleDriveFolderLink: args.onChangeGoogleDriveFolderLink,
    onOpenGoogleDriveFolder: args.onOpenGoogleDriveFolder,
    onImportGoogleDriveFile: args.onImportGoogleDriveFile,
    onIndexGoogleDriveFolder: args.onIndexGoogleDriveFolder,
    onImportGoogleDriveFolder: args.onImportGoogleDriveFolder,
  } satisfies ChatPageWorkspaceActionsReferences;
}

function buildWorkspaceActionsGpt(args: ChatPageWorkspaceActionsGpt) {
  return {
    resetGptForCurrentKin: args.resetGptForCurrentKin,
    onChangeUploadKind: args.onChangeUploadKind,
    onChangeIngestMode: args.onChangeIngestMode,
    onChangeImageDetail: args.onChangeImageDetail,
    onChangeCompactCharLimit: args.onChangeCompactCharLimit,
    onChangeSimpleImageCharLimit: args.onChangeSimpleImageCharLimit,
    onChangeFileReadPolicy: args.onChangeFileReadPolicy,
    onChangeDriveImportAutoSummary: args.onChangeDriveImportAutoSummary,
  } satisfies ChatPageWorkspaceActionsGpt;
}

function buildWorkspaceActionsBridge(args: ChatPageWorkspaceActionsBridge) {
  return {
    onChangeAutoSendKinSysInput: args.onChangeAutoSendKinSysInput,
    onChangeAutoCopyKinSysResponseToGpt: args.onChangeAutoCopyKinSysResponseToGpt,
    onChangeAutoSendGptSysInput: args.onChangeAutoSendGptSysInput,
    onChangeAutoCopyGptSysResponseToKin: args.onChangeAutoCopyGptSysResponseToKin,
    onChangeAutoCopyFileIngestSysInfoToKin:
      args.onChangeAutoCopyFileIngestSysInfoToKin,
  } satisfies ChatPageWorkspaceActionsBridge;
}

function buildWorkspaceActionsMemory(args: ChatPageWorkspaceActionsMemory) {
  return {
    onChangeMemoryInterpreterSettings: args.onChangeMemoryInterpreterSettings,
    onApproveMemoryRuleCandidate: args.onApproveMemoryRuleCandidate,
    onRejectMemoryRuleCandidate: args.onRejectMemoryRuleCandidate,
    onUpdateMemoryRuleCandidate: args.onUpdateMemoryRuleCandidate,
    onDeleteApprovedMemoryRule: args.onDeleteApprovedMemoryRule,
  } satisfies ChatPageWorkspaceActionsMemory;
}

function buildWorkspaceActionsKin(args: ChatPageWorkspaceActionsKin) {
  return {
    setKinIdInput: args.setKinIdInput,
    setKinNameInput: args.setKinNameInput,
    renameKin: args.renameKin,
  } satisfies ChatPageWorkspaceActionsKin;
}

function buildWorkspaceActionsReset(args: ChatPageWorkspaceActionsReset) {
  return {
    resetTokenStats: args.resetTokenStats,
    connectKin: args.connectKin,
    switchKin: args.switchKin,
    disconnectKin: args.disconnectKin,
    removeKinState: args.removeKinState,
    removeKin: args.removeKin,
  } satisfies ChatPageWorkspaceActionsReset;
}

export function buildChatPageWorkspaceActions(
  args: ChatPageWorkspaceCompositionActions
) {
  return {
    app: buildWorkspaceActionsApp(args.app),
    ui: buildWorkspaceActionsUi(args.ui),
    task: buildWorkspaceActionsTask(args.task),
    protocol: buildWorkspaceActionsProtocol(args.protocol),
    search: buildWorkspaceActionsSearch(args.search),
    references: buildWorkspaceActionsReferences(args.references),
    gpt: buildWorkspaceActionsGpt(args.gpt),
    bridge: buildWorkspaceActionsBridge(args.bridge),
    memory: buildWorkspaceActionsMemory(args.memory),
    kin: buildWorkspaceActionsKin(args.kin),
    reset: buildWorkspaceActionsReset(args.reset),
  } satisfies ChatPageWorkspaceCompositionActions;
}
