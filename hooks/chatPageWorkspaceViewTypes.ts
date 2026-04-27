import type {
  ChatPageControllerAppArgs,
  ChatPageControllerProtocolArgs,
  ChatPageControllerResetArgs,
  ChatPageControllerSearchArgs,
  ChatPageControllerServicesSectionArgs,
  ChatPageControllerTaskArgs,
  ChatPageControllerUiStateArgs,
} from "@/hooks/chatPageControllerCompositionTypes";
import type {
  ChatPageGptPanelCompositionArgs,
  ChatPageKinPanelCompositionArgs,
  ChatPagePanelBaseArgs,
} from "@/hooks/chatPagePanelArgsTypes";
import type { ChatPageWorkspaceViewReferencesArgs } from "@/hooks/chatPageWorkspaceReferenceTypes";
import type { AutoBridgeSettings } from "@/hooks/useAutoBridgeSettings";

export type ChatPageWorkspaceViewAppArgs = ChatPagePanelBaseArgs["app"] &
  Pick<
    ChatPageControllerAppArgs,
    "setActivePanelTab" | "focusKinPanel" | "focusGptPanel" | "setKinConnectionState"
  >;

export type ChatPageWorkspaceViewUiArgs = ChatPageControllerUiStateArgs & {
  kinBottomRef: ChatPageKinPanelCompositionArgs["kinState"]["kinBottomRef"];
  gptBottomRef: ChatPageGptPanelCompositionArgs["gptState"]["gptBottomRef"];
};

export type ChatPageWorkspaceViewTaskArgs = ChatPageControllerTaskArgs & {
  taskRegistrationDraft:
    ChatPageGptPanelCompositionArgs["task"]["taskRegistrationDraft"];
  taskDraftCount: ChatPageGptPanelCompositionArgs["task"]["taskDraftCount"];
  activeTaskDraftIndex: ChatPageGptPanelCompositionArgs["task"]["activeTaskDraftIndex"];
  registeredTasks: ChatPageGptPanelCompositionArgs["task"]["registeredTasks"];
  editingRegisteredTaskId:
    ChatPageGptPanelCompositionArgs["task"]["editingRegisteredTaskId"];
  taskRegistrationLibrarySettings:
    ChatPageGptPanelCompositionArgs["task"]["taskRegistrationLibrarySettings"];
  taskRegistrationRecurrence:
    ChatPageGptPanelCompositionArgs["task"]["taskRegistrationRecurrence"];
  updateTaskDraftFields: ChatPageGptPanelCompositionArgs["task"]["updateTaskDraftFields"];
  buildTaskRequestAnswerDraft: ChatPageGptPanelCompositionArgs["task"]["buildTaskRequestAnswerDraft"];
  syncTaskRegistrationDraftFromProtocol:
    ChatPageControllerTaskArgs["syncTaskRegistrationDraftFromProtocol"];
  registerCurrentTaskDraft:
    ChatPageGptPanelCompositionArgs["task"]["registerCurrentTaskDraft"];
  saveCurrentTaskDraftToRegisteredTask:
    ChatPageGptPanelCompositionArgs["task"]["saveCurrentTaskDraftToRegisteredTask"];
  editRegisteredTask: ChatPageGptPanelCompositionArgs["task"]["editRegisteredTask"];
  deleteRegisteredTask:
    ChatPageGptPanelCompositionArgs["task"]["deleteRegisteredTask"];
  cancelTaskRegistrationEdit:
    ChatPageGptPanelCompositionArgs["task"]["cancelTaskRegistrationEdit"];
  setTaskRegistrationLibrarySettings:
    ChatPageGptPanelCompositionArgs["task"]["setTaskRegistrationLibrarySettings"];
  setTaskRegistrationRecurrence:
    ChatPageGptPanelCompositionArgs["task"]["setTaskRegistrationRecurrence"];
  onSelectPreviousTaskDraft?: ChatPageGptPanelCompositionArgs["task"]["onSelectPreviousTaskDraft"];
  onSelectNextTaskDraft?: ChatPageGptPanelCompositionArgs["task"]["onSelectNextTaskDraft"];
};

export type ChatPageWorkspaceViewProtocolArgs = ChatPageControllerProtocolArgs &
  ChatPageGptPanelCompositionArgs["protocolState"];

export type ChatPageWorkspaceViewSearchArgs = ChatPageControllerSearchArgs & {
  searchHistory: ChatPageGptPanelCompositionArgs["references"]["searchHistory"];
  selectedTaskSearchResultId:
    ChatPageGptPanelCompositionArgs["references"]["selectedTaskSearchResultId"];
  onMoveSearchHistoryItem:
    ChatPageGptPanelCompositionArgs["references"]["onMoveSearchHistoryItem"];
  onSelectTaskSearchResult:
    ChatPageGptPanelCompositionArgs["references"]["onSelectTaskSearchResult"];
  onDeleteSearchHistoryItem:
    ChatPageGptPanelCompositionArgs["references"]["onDeleteSearchHistoryItem"];
  sourceDisplayCount: ChatPageGptPanelCompositionArgs["settings"]["sourceDisplayCount"];
  onChangeSearchMode:
    ChatPageGptPanelCompositionArgs["settings"]["onChangeSearchMode"];
  onChangeSearchEngines:
    ChatPageGptPanelCompositionArgs["settings"]["onChangeSearchEngines"];
  onChangeSearchLocation:
    ChatPageGptPanelCompositionArgs["settings"]["onChangeSearchLocation"];
  onChangeSourceDisplayCount:
    ChatPageGptPanelCompositionArgs["settings"]["onChangeSourceDisplayCount"];
};

export type ChatPageWorkspaceViewGptArgs = {
  gptState: ChatPageGptPanelCompositionArgs["gptState"]["gptState"];
  resetGptForCurrentKin: ChatPageControllerResetArgs["resetGptForCurrentKin"];
  gptMemoryRuntime: ChatPageControllerServicesSectionArgs["gptMemoryRuntime"];
  uploadKind: ChatPageGptPanelCompositionArgs["settings"]["uploadKind"];
  onChangeUploadKind: ChatPageControllerServicesSectionArgs["setUploadKind"];
  ingestMode: ChatPageGptPanelCompositionArgs["settings"]["ingestMode"];
  onChangeIngestMode:
    ChatPageGptPanelCompositionArgs["settings"]["onChangeIngestMode"];
  imageDetail: ChatPageGptPanelCompositionArgs["settings"]["imageDetail"];
  onChangeImageDetail:
    ChatPageGptPanelCompositionArgs["settings"]["onChangeImageDetail"];
  compactCharLimit:
    ChatPageGptPanelCompositionArgs["settings"]["compactCharLimit"];
  onChangeCompactCharLimit:
    ChatPageGptPanelCompositionArgs["settings"]["onChangeCompactCharLimit"];
  simpleImageCharLimit:
    ChatPageGptPanelCompositionArgs["settings"]["simpleImageCharLimit"];
  onChangeSimpleImageCharLimit:
    ChatPageGptPanelCompositionArgs["settings"]["onChangeSimpleImageCharLimit"];
  fileReadPolicy: ChatPageGptPanelCompositionArgs["settings"]["fileReadPolicy"];
  autoGenerateLibrarySummary:
    ChatPageGptPanelCompositionArgs["settings"]["autoGenerateLibrarySummary"];
  onChangeFileReadPolicy:
    ChatPageGptPanelCompositionArgs["settings"]["onChangeFileReadPolicy"];
  onChangeAutoGenerateLibrarySummary:
    ChatPageGptPanelCompositionArgs["settings"]["onChangeAutoGenerateLibrarySummary"];
  defaultMemorySettings:
    ChatPageGptPanelCompositionArgs["settings"]["defaultMemorySettings"];
  gptMemorySettingsControls:
    ChatPageControllerServicesSectionArgs["gptMemorySettingsControls"];
};

export type ChatPageWorkspaceViewBridgeArgs = {
  autoBridgeSettings: AutoBridgeSettings;
  onChangeAutoSendKinSysInput:
    ChatPageGptPanelCompositionArgs["settings"]["onChangeAutoSendKinSysInput"];
  onChangeAutoCopyKinSysResponseToGpt:
    ChatPageGptPanelCompositionArgs["settings"]["onChangeAutoCopyKinSysResponseToGpt"];
  onChangeAutoSendGptSysInput:
    ChatPageGptPanelCompositionArgs["settings"]["onChangeAutoSendGptSysInput"];
  onChangeAutoCopyGptSysResponseToKin:
    ChatPageGptPanelCompositionArgs["settings"]["onChangeAutoCopyGptSysResponseToKin"];
  onChangeAutoCopyFileIngestSysInfoToKin:
    ChatPageGptPanelCompositionArgs["settings"]["onChangeAutoCopyFileIngestSysInfoToKin"];
};

export type ChatPageWorkspaceViewMemoryArgs = {
  tokenStats: ChatPageGptPanelCompositionArgs["settings"]["tokenStats"];
  memorySettings: ChatPageGptPanelCompositionArgs["settings"]["memorySettings"];
  memoryInterpreterSettings:
    ChatPageGptPanelCompositionArgs["memoryState"]["memoryInterpreterSettings"];
  pendingMemoryRuleCandidates:
    ChatPageGptPanelCompositionArgs["memoryState"]["pendingMemoryRuleCandidates"];
  approvedMemoryRules:
    ChatPageGptPanelCompositionArgs["memoryState"]["approvedMemoryRules"];
  onChangeMemoryInterpreterSettings:
    ChatPageGptPanelCompositionArgs["settings"]["onChangeMemoryInterpreterSettings"];
  onApproveMemoryRuleCandidate:
    ChatPageGptPanelCompositionArgs["memoryState"]["onApproveMemoryRuleCandidate"];
  onRejectMemoryRuleCandidate:
    ChatPageGptPanelCompositionArgs["memoryState"]["onRejectMemoryRuleCandidate"];
  onUpdateMemoryRuleCandidate:
    ChatPageGptPanelCompositionArgs["memoryState"]["onUpdateMemoryRuleCandidate"];
  onDeleteApprovedMemoryRule:
    ChatPageGptPanelCompositionArgs["memoryState"]["onDeleteApprovedMemoryRule"];
};

export type ChatPageWorkspaceViewUsageArgs = Pick<
  ChatPageControllerServicesSectionArgs,
  | "applySearchUsage"
  | "applyChatUsage"
  | "applyCompressionUsage"
  | "applyTaskUsage"
  | "applyIngestUsage"
  | "recordIngestedDocument"
>;

export type ChatPageWorkspaceViewKinArgs = {
  kinIdInput: ChatPageKinPanelCompositionArgs["kinState"]["kinIdInput"];
  setKinIdInput: ChatPageKinPanelCompositionArgs["kinState"]["setKinIdInput"];
  kinNameInput: ChatPageKinPanelCompositionArgs["kinState"]["kinNameInput"];
  setKinNameInput: ChatPageKinPanelCompositionArgs["kinState"]["setKinNameInput"];
  renameKin: ChatPageKinPanelCompositionArgs["kinState"]["renameKin"];
};

export type ChatPageWorkspaceViewResetArgs = Pick<
  ChatPageControllerResetArgs,
  | "resetTokenStats"
  | "connectKin"
  | "switchKin"
  | "disconnectKin"
  | "removeKinState"
  | "removeKin"
>;

export type ChatPageWorkspaceViewArgs = {
  app: ChatPageWorkspaceViewAppArgs;
  ui: ChatPageWorkspaceViewUiArgs;
  task: ChatPageWorkspaceViewTaskArgs;
  protocol: ChatPageWorkspaceViewProtocolArgs;
  search: ChatPageWorkspaceViewSearchArgs;
  references: ChatPageWorkspaceViewReferencesArgs;
  gpt: ChatPageWorkspaceViewGptArgs;
  bridge: ChatPageWorkspaceViewBridgeArgs;
  memory: ChatPageWorkspaceViewMemoryArgs;
  usage: ChatPageWorkspaceViewUsageArgs;
  kin: ChatPageWorkspaceViewKinArgs;
  reset: ChatPageWorkspaceViewResetArgs;
};
