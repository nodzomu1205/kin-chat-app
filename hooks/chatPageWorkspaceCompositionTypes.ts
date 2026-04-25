import type {
  ChatPageWorkspaceViewAppArgs,
  ChatPageWorkspaceViewBridgeArgs,
  ChatPageWorkspaceViewGptArgs,
  ChatPageWorkspaceViewKinArgs,
  ChatPageWorkspaceViewMemoryArgs,
  ChatPageWorkspaceViewProtocolArgs,
  ChatPageWorkspaceViewReferencesArgs,
  ChatPageWorkspaceViewResetArgs,
  ChatPageWorkspaceViewSearchArgs,
  ChatPageWorkspaceViewTaskArgs,
  ChatPageWorkspaceViewUiArgs,
  ChatPageWorkspaceViewUsageArgs,
} from "@/hooks/chatPagePanelCompositionTypes";

export type ChatPageWorkspaceCompositionState = {
  app: Pick<
    ChatPageWorkspaceViewAppArgs,
    "currentKin" | "currentKinLabel" | "kinStatus" | "kinList" | "isMobile"
  >;
  ui: Omit<
    ChatPageWorkspaceViewUiArgs,
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
    ChatPageWorkspaceViewTaskArgs,
    "currentTaskDraft" | "taskDraftCount" | "activeTaskDraftIndex"
  >;
  protocol: Pick<
    ChatPageWorkspaceViewProtocolArgs,
    | "approvedIntentPhrases"
    | "rejectedIntentCandidateSignatures"
    | "pendingIntentCandidates"
    | "protocolPrompt"
    | "protocolRulebook"
  >;
  search: Pick<
    ChatPageWorkspaceViewSearchArgs,
    | "lastSearchContext"
    | "searchHistory"
    | "selectedTaskSearchResultId"
    | "searchMode"
    | "searchEngines"
    | "searchLocation"
    | "sourceDisplayCount"
  >;
  references: Pick<
    ChatPageWorkspaceViewReferencesArgs,
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
    | "googleDriveFolderLink"
    | "googleDriveFolderId"
    | "googleDriveIntegrationMode"
  >;
  gpt: Pick<
    ChatPageWorkspaceViewGptArgs,
    | "gptState"
    | "uploadKind"
    | "ingestMode"
    | "imageDetail"
    | "compactCharLimit"
    | "simpleImageCharLimit"
    | "fileReadPolicy"
    | "driveImportAutoSummary"
    | "defaultMemorySettings"
  >;
  bridge: Pick<ChatPageWorkspaceViewBridgeArgs, "autoBridgeSettings">;
  memory: Pick<
    ChatPageWorkspaceViewMemoryArgs,
    | "tokenStats"
    | "memorySettings"
    | "memoryInterpreterSettings"
    | "pendingMemoryRuleCandidates"
    | "approvedMemoryRules"
  >;
  kin: Pick<ChatPageWorkspaceViewKinArgs, "kinIdInput" | "kinNameInput">;
};

export type ChatPageWorkspaceCompositionActions = {
  app: Pick<
    ChatPageWorkspaceViewAppArgs,
    "setActivePanelTab" | "focusKinPanel" | "focusGptPanel" | "setKinConnectionState"
  >;
  ui: Pick<
    ChatPageWorkspaceViewUiArgs,
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
    ChatPageWorkspaceViewTaskArgs,
    | "setCurrentTaskDraft"
    | "resetCurrentTaskDraft"
    | "updateTaskDraftFields"
    | "buildTaskRequestAnswerDraft"
    | "onSelectPreviousTaskDraft"
    | "onSelectNextTaskDraft"
  >;
  protocol: Pick<
    ChatPageWorkspaceViewProtocolArgs,
    | "setPendingIntentCandidates"
    | "setApprovedIntentPhrases"
    | "setRejectedIntentCandidateSignatures"
    | "setProtocolPrompt"
    | "setProtocolRulebook"
    | "onChangeProtocolPrompt"
    | "onChangeProtocolRulebook"
  >;
  search: Pick<
    ChatPageWorkspaceViewSearchArgs,
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
    ChatPageWorkspaceViewReferencesArgs,
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
    | "onShowLibraryItemInChat"
    | "onSendLibraryItemToKin"
    | "onUploadLibraryItemToGoogleDrive"
    | "onChangeAutoLibraryReferenceEnabled"
    | "onChangeLibraryReferenceMode"
    | "onChangeLibraryIndexResponseCount"
    | "onChangeLibraryReferenceCount"
    | "onChangeGoogleDriveFolderLink"
    | "onOpenGoogleDriveFolder"
    | "onImportGoogleDriveFile"
    | "onIndexGoogleDriveFolder"
    | "onImportGoogleDriveFolder"
  >;
  gpt: Pick<
    ChatPageWorkspaceViewGptArgs,
    | "resetGptForCurrentKin"
    | "onChangeUploadKind"
    | "onChangeIngestMode"
    | "onChangeImageDetail"
    | "onChangeCompactCharLimit"
    | "onChangeSimpleImageCharLimit"
    | "onChangeFileReadPolicy"
    | "onChangeDriveImportAutoSummary"
  >;
  bridge: Pick<
    ChatPageWorkspaceViewBridgeArgs,
    | "onChangeAutoSendKinSysInput"
    | "onChangeAutoCopyKinSysResponseToGpt"
    | "onChangeAutoSendGptSysInput"
    | "onChangeAutoCopyGptSysResponseToKin"
    | "onChangeAutoCopyFileIngestSysInfoToKin"
  >;
  memory: Pick<
    ChatPageWorkspaceViewMemoryArgs,
    | "onChangeMemoryInterpreterSettings"
    | "onApproveMemoryRuleCandidate"
    | "onRejectMemoryRuleCandidate"
    | "onUpdateMemoryRuleCandidate"
    | "onDeleteApprovedMemoryRule"
  >;
  kin: Pick<
    ChatPageWorkspaceViewKinArgs,
    "setKinIdInput" | "setKinNameInput" | "renameKin"
  >;
  reset: ChatPageWorkspaceViewResetArgs;
};

export type ChatPageWorkspaceCompositionServices = {
  task: Pick<
    ChatPageWorkspaceViewTaskArgs,
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
    ChatPageWorkspaceViewProtocolArgs,
    "chatBridgeSettings" | "promptDefaultKey" | "rulebookDefaultKey"
  >;
  search: Pick<
    ChatPageWorkspaceViewSearchArgs,
    | "processMultipartTaskDoneText"
    | "recordSearchContext"
    | "getContinuationTokenForSeries"
    | "getAskAiModeLinkForQuery"
  >;
  references: Pick<
    ChatPageWorkspaceViewReferencesArgs,
    "buildLibraryReferenceContext"
  >;
  gpt: Pick<
    ChatPageWorkspaceViewGptArgs,
    "gptMemoryRuntime" | "gptMemorySettingsControls"
  >;
  usage: ChatPageWorkspaceViewUsageArgs;
};

export type ChatPageWorkspaceCompositionInput = {
  state: ChatPageWorkspaceCompositionState;
  actions: ChatPageWorkspaceCompositionActions;
  services: ChatPageWorkspaceCompositionServices;
};

export type ChatPageWorkspaceStateApp = ChatPageWorkspaceCompositionState["app"];
export type ChatPageWorkspaceStateUi = ChatPageWorkspaceCompositionState["ui"];
export type ChatPageWorkspaceStateTask = ChatPageWorkspaceCompositionState["task"];
export type ChatPageWorkspaceStateProtocol =
  ChatPageWorkspaceCompositionState["protocol"];
export type ChatPageWorkspaceStateSearch =
  ChatPageWorkspaceCompositionState["search"];
export type ChatPageWorkspaceStateReferences =
  ChatPageWorkspaceCompositionState["references"];
export type ChatPageWorkspaceStateGpt = ChatPageWorkspaceCompositionState["gpt"];
export type ChatPageWorkspaceStateBridge =
  ChatPageWorkspaceCompositionState["bridge"];
export type ChatPageWorkspaceStateMemory =
  ChatPageWorkspaceCompositionState["memory"];
export type ChatPageWorkspaceStateKin = ChatPageWorkspaceCompositionState["kin"];

export type ChatPageWorkspaceActionsApp =
  ChatPageWorkspaceCompositionActions["app"];
export type ChatPageWorkspaceActionsUi =
  ChatPageWorkspaceCompositionActions["ui"];
export type ChatPageWorkspaceActionsTask =
  ChatPageWorkspaceCompositionActions["task"];
export type ChatPageWorkspaceActionsProtocol =
  ChatPageWorkspaceCompositionActions["protocol"];
export type ChatPageWorkspaceActionsSearch =
  ChatPageWorkspaceCompositionActions["search"];
export type ChatPageWorkspaceActionsReferences =
  ChatPageWorkspaceCompositionActions["references"];
export type ChatPageWorkspaceActionsGpt =
  ChatPageWorkspaceCompositionActions["gpt"];
export type ChatPageWorkspaceActionsBridge =
  ChatPageWorkspaceCompositionActions["bridge"];
export type ChatPageWorkspaceActionsMemory =
  ChatPageWorkspaceCompositionActions["memory"];
export type ChatPageWorkspaceActionsKin =
  ChatPageWorkspaceCompositionActions["kin"];
export type ChatPageWorkspaceActionsReset =
  ChatPageWorkspaceCompositionActions["reset"];

export type ChatPageWorkspaceServicesTask =
  ChatPageWorkspaceCompositionServices["task"];
export type ChatPageWorkspaceServicesProtocol =
  ChatPageWorkspaceCompositionServices["protocol"];
export type ChatPageWorkspaceServicesSearch =
  ChatPageWorkspaceCompositionServices["search"];
export type ChatPageWorkspaceServicesReferences =
  ChatPageWorkspaceCompositionServices["references"];
export type ChatPageWorkspaceServicesGpt =
  ChatPageWorkspaceCompositionServices["gpt"];
export type ChatPageWorkspaceServicesUsage =
  ChatPageWorkspaceCompositionServices["usage"];
