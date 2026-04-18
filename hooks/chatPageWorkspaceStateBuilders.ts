import type {
  ChatPageWorkspaceCompositionState,
  ChatPageWorkspaceStateApp,
  ChatPageWorkspaceStateBridge,
  ChatPageWorkspaceStateGpt,
  ChatPageWorkspaceStateKin,
  ChatPageWorkspaceStateMemory,
  ChatPageWorkspaceStateProtocol,
  ChatPageWorkspaceStateReferences,
  ChatPageWorkspaceStateSearch,
  ChatPageWorkspaceStateTask,
  ChatPageWorkspaceStateUi,
} from "@/hooks/chatPageWorkspaceCompositionTypes";

function buildWorkspaceStateApp(args: ChatPageWorkspaceStateApp) {
  return {
    currentKin: args.currentKin,
    currentKinLabel: args.currentKinLabel,
    kinStatus: args.kinStatus,
    kinList: args.kinList,
    isMobile: args.isMobile,
  } satisfies ChatPageWorkspaceStateApp;
}

function buildWorkspaceStateUi(args: ChatPageWorkspaceStateUi) {
  return {
    gptInput: args.gptInput,
    kinInput: args.kinInput,
    gptLoading: args.gptLoading,
    kinLoading: args.kinLoading,
    ingestLoading: args.ingestLoading,
    gptMessages: args.gptMessages,
    kinMessages: args.kinMessages,
    pendingKinInjectionBlocks: args.pendingKinInjectionBlocks,
    pendingKinInjectionIndex: args.pendingKinInjectionIndex,
  } satisfies ChatPageWorkspaceStateUi;
}

function buildWorkspaceStateTask(args: ChatPageWorkspaceStateTask) {
  return {
    currentTaskDraft: args.currentTaskDraft,
    taskDraftCount: args.taskDraftCount,
    activeTaskDraftIndex: args.activeTaskDraftIndex,
  } satisfies ChatPageWorkspaceStateTask;
}

function buildWorkspaceStateProtocol(args: ChatPageWorkspaceStateProtocol) {
  return {
    approvedIntentPhrases: args.approvedIntentPhrases,
    rejectedIntentCandidateSignatures: args.rejectedIntentCandidateSignatures,
    pendingIntentCandidates: args.pendingIntentCandidates,
    protocolPrompt: args.protocolPrompt,
    protocolRulebook: args.protocolRulebook,
  } satisfies ChatPageWorkspaceStateProtocol;
}

function buildWorkspaceStateSearch(args: ChatPageWorkspaceStateSearch) {
  return {
    lastSearchContext: args.lastSearchContext,
    searchHistory: args.searchHistory,
    selectedTaskSearchResultId: args.selectedTaskSearchResultId,
    searchMode: args.searchMode,
    searchEngines: args.searchEngines,
    searchLocation: args.searchLocation,
    sourceDisplayCount: args.sourceDisplayCount,
  } satisfies ChatPageWorkspaceStateSearch;
}

function buildWorkspaceStateReferences(args: ChatPageWorkspaceStateReferences) {
  return {
    multipartAssemblies: args.multipartAssemblies,
    storedDocuments: args.storedDocuments,
    referenceLibraryItems: args.referenceLibraryItems,
    selectedTaskLibraryItemId: args.selectedTaskLibraryItemId,
    autoLibraryReferenceEnabled: args.autoLibraryReferenceEnabled,
    libraryReferenceMode: args.libraryReferenceMode,
    libraryIndexResponseCount: args.libraryIndexResponseCount,
    libraryReferenceCount: args.libraryReferenceCount,
    libraryStorageMB: args.libraryStorageMB,
    libraryReferenceEstimatedTokens: args.libraryReferenceEstimatedTokens,
    googleDriveFolderLink: args.googleDriveFolderLink,
    googleDriveFolderId: args.googleDriveFolderId,
    googleDriveIntegrationMode: args.googleDriveIntegrationMode,
  } satisfies ChatPageWorkspaceStateReferences;
}

function buildWorkspaceStateGpt(args: ChatPageWorkspaceStateGpt) {
  return {
    gptState: args.gptState,
    responseMode: args.responseMode,
    uploadKind: args.uploadKind,
    ingestMode: args.ingestMode,
    imageDetail: args.imageDetail,
    compactCharLimit: args.compactCharLimit,
    simpleImageCharLimit: args.simpleImageCharLimit,
    postIngestAction: args.postIngestAction,
    fileReadPolicy: args.fileReadPolicy,
    driveImportAutoSummary: args.driveImportAutoSummary,
    defaultMemorySettings: args.defaultMemorySettings,
  } satisfies ChatPageWorkspaceStateGpt;
}

function buildWorkspaceStateBridge(args: ChatPageWorkspaceStateBridge) {
  return {
    autoBridgeSettings: args.autoBridgeSettings,
  } satisfies ChatPageWorkspaceStateBridge;
}

function buildWorkspaceStateMemory(args: ChatPageWorkspaceStateMemory) {
  return {
    tokenStats: args.tokenStats,
    memorySettings: args.memorySettings,
    memoryInterpreterSettings: args.memoryInterpreterSettings,
    pendingMemoryRuleCandidates: args.pendingMemoryRuleCandidates,
    approvedMemoryRules: args.approvedMemoryRules,
  } satisfies ChatPageWorkspaceStateMemory;
}

function buildWorkspaceStateKin(args: ChatPageWorkspaceStateKin) {
  return {
    kinIdInput: args.kinIdInput,
    kinNameInput: args.kinNameInput,
  } satisfies ChatPageWorkspaceStateKin;
}

export function buildChatPageWorkspaceState(
  args: ChatPageWorkspaceCompositionState
) {
  return {
    app: buildWorkspaceStateApp(args.app),
    ui: buildWorkspaceStateUi(args.ui),
    task: buildWorkspaceStateTask(args.task),
    protocol: buildWorkspaceStateProtocol(args.protocol),
    search: buildWorkspaceStateSearch(args.search),
    references: buildWorkspaceStateReferences(args.references),
    gpt: buildWorkspaceStateGpt(args.gpt),
    bridge: buildWorkspaceStateBridge(args.bridge),
    memory: buildWorkspaceStateMemory(args.memory),
    kin: buildWorkspaceStateKin(args.kin),
  } satisfies ChatPageWorkspaceCompositionState;
}

