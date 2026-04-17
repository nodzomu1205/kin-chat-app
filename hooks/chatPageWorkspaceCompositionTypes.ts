import type { ChatPageWorkspaceViewArgs } from "@/hooks/chatPagePanelCompositionTypes";

export type ChatPageWorkspaceCompositionState = {
  app: Pick<
    ChatPageWorkspaceViewArgs["app"],
    "currentKin" | "currentKinLabel" | "kinStatus" | "kinList" | "isMobile"
  >;
  ui: Omit<
    ChatPageWorkspaceViewArgs["ui"],
    | "setKinInput"
    | "setGptInput"
    | "setKinMessages"
    | "setGptMessages"
    | "setKinLoading"
    | "setGptLoading"
    | "setIngestLoading"
    | "setPendingKinInjectionBlocks"
    | "setPendingKinInjectionIndex"
    | "kinBottomRef"
    | "gptBottomRef"
  >;
  task: Pick<
    ChatPageWorkspaceViewArgs["task"],
    "currentTaskDraft" | "taskDraftCount" | "activeTaskDraftIndex"
  >;
  protocol: Pick<
    ChatPageWorkspaceViewArgs["protocol"],
    | "approvedIntentPhrases"
    | "rejectedIntentCandidateSignatures"
    | "pendingIntentCandidates"
    | "protocolPrompt"
    | "protocolRulebook"
  >;
  search: Pick<
    ChatPageWorkspaceViewArgs["search"],
    | "lastSearchContext"
    | "searchHistory"
    | "selectedTaskSearchResultId"
    | "searchMode"
    | "searchEngines"
    | "searchLocation"
    | "sourceDisplayCount"
  >;
  references: Pick<
    ChatPageWorkspaceViewArgs["references"],
    | "multipartAssemblies"
    | "storedDocuments"
    | "referenceLibraryItems"
    | "selectedTaskLibraryItemId"
    | "autoLibraryReferenceEnabled"
    | "libraryReferenceMode"
    | "libraryIndexResponseCount"
    | "libraryReferenceCount"
    | "libraryStorageMB"
    | "libraryReferenceEstimatedTokens"
  >;
  gpt: Pick<
    ChatPageWorkspaceViewArgs["gpt"],
    | "gptState"
    | "responseMode"
    | "uploadKind"
    | "ingestMode"
    | "imageDetail"
    | "compactCharLimit"
    | "simpleImageCharLimit"
    | "postIngestAction"
    | "fileReadPolicy"
    | "defaultMemorySettings"
  >;
  bridge: Pick<ChatPageWorkspaceViewArgs["bridge"], "autoBridgeSettings">;
  memory: Pick<
    ChatPageWorkspaceViewArgs["memory"],
    | "tokenStats"
    | "memorySettings"
    | "memoryInterpreterSettings"
    | "pendingMemoryRuleCandidates"
    | "approvedMemoryRules"
  >;
  kin: Pick<ChatPageWorkspaceViewArgs["kin"], "kinIdInput" | "kinNameInput">;
};

export type ChatPageWorkspaceCompositionActions = {
  app: Pick<
    ChatPageWorkspaceViewArgs["app"],
    "setActiveTab" | "setKinConnectionState"
  >;
  ui: Pick<
    ChatPageWorkspaceViewArgs["ui"],
    | "setKinInput"
    | "setGptInput"
    | "setKinMessages"
    | "setGptMessages"
    | "setKinLoading"
    | "setGptLoading"
    | "setIngestLoading"
    | "setPendingKinInjectionBlocks"
    | "setPendingKinInjectionIndex"
  >;
  task: Pick<
    ChatPageWorkspaceViewArgs["task"],
    | "setCurrentTaskDraft"
    | "resetCurrentTaskDraft"
    | "updateTaskDraftFields"
    | "buildTaskRequestAnswerDraft"
    | "onSelectPreviousTaskDraft"
    | "onSelectNextTaskDraft"
  >;
  protocol: Pick<
    ChatPageWorkspaceViewArgs["protocol"],
    | "setPendingIntentCandidates"
    | "setApprovedIntentPhrases"
    | "setRejectedIntentCandidateSignatures"
    | "setProtocolPrompt"
    | "setProtocolRulebook"
    | "onChangeProtocolPrompt"
    | "onChangeProtocolRulebook"
  >;
  search: Pick<
    ChatPageWorkspaceViewArgs["search"],
    | "clearSearchHistory"
    | "deleteSearchHistoryItemBase"
    | "onMoveSearchHistoryItem"
    | "onSelectTaskSearchResult"
    | "onDeleteSearchHistoryItem"
    | "onChangeSearchMode"
    | "onChangeSearchEngines"
    | "onChangeSearchLocation"
    | "onChangeSourceDisplayCount"
  >;
  references: Pick<
    ChatPageWorkspaceViewArgs["references"],
    | "onDeleteMultipartAssembly"
    | "onLoadMultipartAssemblyToGptInput"
    | "onDownloadMultipartAssembly"
    | "onLoadStoredDocumentToGptInput"
    | "onDownloadStoredDocument"
    | "onDeleteStoredDocument"
    | "onMoveStoredDocument"
    | "onMoveLibraryItem"
    | "onSelectTaskLibraryItem"
    | "onChangeLibraryItemMode"
    | "onSaveStoredDocument"
    | "onChangeAutoLibraryReferenceEnabled"
    | "onChangeLibraryReferenceMode"
    | "onChangeLibraryIndexResponseCount"
    | "onChangeLibraryReferenceCount"
  >;
  gpt: Pick<
    ChatPageWorkspaceViewArgs["gpt"],
    | "resetGptForCurrentKin"
    | "onChangeResponseMode"
    | "onChangeUploadKind"
    | "onChangeIngestMode"
    | "onChangeImageDetail"
    | "onChangeCompactCharLimit"
    | "onChangeSimpleImageCharLimit"
    | "onChangePostIngestAction"
    | "onChangeFileReadPolicy"
  >;
  bridge: Pick<
    ChatPageWorkspaceViewArgs["bridge"],
    | "onChangeAutoSendKinSysInput"
    | "onChangeAutoCopyKinSysResponseToGpt"
    | "onChangeAutoSendGptSysInput"
    | "onChangeAutoCopyGptSysResponseToKin"
    | "onChangeAutoCopyFileIngestSysInfoToKin"
  >;
  memory: Pick<
    ChatPageWorkspaceViewArgs["memory"],
    | "onChangeMemoryInterpreterSettings"
    | "onApproveMemoryRuleCandidate"
    | "onRejectMemoryRuleCandidate"
    | "onUpdateMemoryRuleCandidate"
    | "onDeleteApprovedMemoryRule"
  >;
  kin: Pick<
    ChatPageWorkspaceViewArgs["kin"],
    "setKinIdInput" | "setKinNameInput" | "renameKin"
  >;
  reset: ChatPageWorkspaceViewArgs["reset"];
};

export type ChatPageWorkspaceCompositionServices = {
  task: Pick<
    ChatPageWorkspaceViewArgs["task"],
    | "getTaskBaseText"
    | "getTaskLibraryItem"
    | "getResolvedTaskTitle"
    | "resolveTaskTitleFromDraft"
    | "getTaskSlotLabel"
    | "syncTaskDraftFromProtocol"
    | "applyPrefixedTaskFieldsFromText"
    | "getCurrentTaskCharConstraint"
    | "taskProtocol"
    | "taskProtocolView"
  >;
  protocol: Pick<
    ChatPageWorkspaceViewArgs["protocol"],
    "chatBridgeSettings" | "promptDefaultKey" | "rulebookDefaultKey"
  >;
  search: Pick<
    ChatPageWorkspaceViewArgs["search"],
    | "processMultipartTaskDoneText"
    | "recordSearchContext"
    | "getContinuationTokenForSeries"
    | "getAskAiModeLinkForQuery"
  >;
  references: Pick<
    ChatPageWorkspaceViewArgs["references"],
    "buildLibraryReferenceContext"
  >;
  gpt: Pick<
    ChatPageWorkspaceViewArgs["gpt"],
    "gptMemoryRuntime" | "gptMemorySettingsControls"
  >;
  usage: ChatPageWorkspaceViewArgs["usage"];
};

export type ChatPageWorkspaceCompositionInput = {
  state: ChatPageWorkspaceCompositionState;
  actions: ChatPageWorkspaceCompositionActions;
  services: ChatPageWorkspaceCompositionServices;
};
