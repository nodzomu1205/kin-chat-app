import type { KinPanelProps } from "@/components/panels/kin/kinPanelTypes";
import type {
  ChatPageControllerAppArgs,
  ChatPageControllerProtocolArgs,
  ChatPageControllerResetArgs,
  ChatPageControllerSearchArgs,
  ChatPageControllerServicesSectionArgs,
  ChatPageControllerTaskArgs,
  ChatPageControllerUiStateArgs,
  TaskProtocolView,
} from "@/hooks/chatPageControllerCompositionTypes";
import type { ChatPageControllerGroups } from "@/hooks/useChatPageController";
import type { BuildGptPanelArgs } from "@/lib/app/ui-state/panelPropsBuilders";
import type {
  ApprovedMemoryRule,
  MemoryInterpreterSettings,
  PendingMemoryRuleCandidate,
} from "@/lib/memoryInterpreterRules";
import type { AutoBridgeSettings } from "@/hooks/useAutoBridgeSettings";
import type {
  ApprovedIntentPhrase,
  PendingIntentCandidate,
} from "@/lib/taskIntent";
import type { Message, ReferenceLibraryItem, StoredDocument } from "@/types/chat";
import type { SearchContext, TaskDraft } from "@/types/task";

export type ChatPagePanelBaseArgs = {
  app: {
    currentKin: string | null;
    currentKinLabel: string | null;
    kinStatus: string;
    kinList: KinPanelProps["kinList"];
    isMobile: boolean;
  };
  taskProtocolView: TaskProtocolView;
  controller: ChatPageControllerGroups;
};

export type ChatPageKinPanelCompositionArgs = ChatPagePanelBaseArgs & {
  onSwitchToGptPanel: () => void;
  kinState: {
    kinIdInput: string;
    setKinIdInput: (value: string) => void;
    kinNameInput: string;
    setKinNameInput: (value: string) => void;
    currentKin: string | null;
    kinMessages: Message[];
    kinInput: string;
    setKinInput: (value: string) => void;
    renameKin: KinPanelProps["renameKin"];
    kinBottomRef: KinPanelProps["kinBottomRef"];
    loading: boolean;
    pendingInjectionBlocks: string[];
    pendingInjectionIndex: number;
  };
};

export type ChatPageGptPanelCompositionArgs = ChatPagePanelBaseArgs & {
  onSwitchToKinPanel: () => void;
  pendingInjection: {
    blocks: string[];
    index: number;
  };
  gptState: {
    gptState: BuildGptPanelArgs["chat"]["gptState"];
    gptMessages: Message[];
    gptInput: string;
    setGptInput: BuildGptPanelArgs["chat"]["setGptInput"];
    gptBottomRef: BuildGptPanelArgs["chat"]["gptBottomRef"];
    loading: boolean;
    ingestLoading: boolean;
  };
  task: {
    currentTaskDraft: TaskDraft;
    taskDraftCount: number;
    activeTaskDraftIndex: number;
    resetCurrentTaskDraft: () => void;
    updateTaskDraftFields: BuildGptPanelArgs["task"]["updateTaskDraftFields"];
    pendingRequests: BuildGptPanelArgs["task"]["pendingRequests"];
    buildTaskRequestAnswerDraft: BuildGptPanelArgs["task"]["buildTaskRequestAnswerDraft"];
    onSaveTaskSnapshot: () => void;
    onSelectPreviousTaskDraft?: () => void;
    onSelectNextTaskDraft?: () => void;
  };
  references: {
    lastSearchContext: SearchContext | null;
    searchHistory: SearchContext[];
    selectedTaskSearchResultId: string;
    multipartAssemblies: BuildGptPanelArgs["references"]["multipartAssemblies"];
    storedDocuments: StoredDocument[];
    referenceLibraryItems: ReferenceLibraryItem[];
    selectedTaskLibraryItemId: string;
    onSelectTaskSearchResult: (rawResultId: string) => void;
    onMoveSearchHistoryItem: BuildGptPanelArgs["references"]["onMoveSearchHistoryItem"];
    onDeleteSearchHistoryItem: BuildGptPanelArgs["references"]["onDeleteSearchHistoryItem"];
    onLoadMultipartAssemblyToGptInput: BuildGptPanelArgs["references"]["onLoadMultipartAssemblyToGptInput"];
    onDownloadMultipartAssembly: BuildGptPanelArgs["references"]["onDownloadMultipartAssembly"];
    onDeleteMultipartAssembly: BuildGptPanelArgs["references"]["onDeleteMultipartAssembly"];
    onLoadStoredDocumentToGptInput: BuildGptPanelArgs["references"]["onLoadStoredDocumentToGptInput"];
    onDownloadStoredDocument: BuildGptPanelArgs["references"]["onDownloadStoredDocument"];
    onDeleteStoredDocument: BuildGptPanelArgs["references"]["onDeleteStoredDocument"];
    onMoveStoredDocument: BuildGptPanelArgs["references"]["onMoveStoredDocument"];
    onMoveLibraryItem: BuildGptPanelArgs["references"]["onMoveLibraryItem"];
    onSelectTaskLibraryItem: (itemId: string) => void;
    onChangeLibraryItemMode: BuildGptPanelArgs["references"]["onChangeLibraryItemMode"];
    onSaveStoredDocument: BuildGptPanelArgs["references"]["onSaveStoredDocument"];
    onShowLibraryItemInChat:
      BuildGptPanelArgs["references"]["onShowLibraryItemInChat"];
    onSendLibraryItemToKin:
      BuildGptPanelArgs["references"]["onSendLibraryItemToKin"];
    onUploadLibraryItemToGoogleDrive:
      BuildGptPanelArgs["references"]["onUploadLibraryItemToGoogleDrive"];
  };
  settings: Omit<
    BuildGptPanelArgs["settings"],
    | "onSaveMemorySettings"
    | "onResetMemorySettings"
    | "memoryInterpreterSettings"
    | "pendingMemoryRuleCandidates"
    | "approvedMemoryRules"
    | "onApproveMemoryRuleCandidate"
    | "onRejectMemoryRuleCandidate"
    | "onUpdateMemoryRuleCandidate"
    | "onDeleteApprovedMemoryRule"
  >;
  protocolState: {
    protocolPrompt: string;
    protocolRulebook: string;
    pendingIntentCandidates: PendingIntentCandidate[];
    approvedIntentPhrases: ApprovedIntentPhrase[];
    onChangeProtocolPrompt: (value: string) => void;
    onChangeProtocolRulebook: (value: string) => void;
  };
  memoryState: {
    memoryInterpreterSettings: MemoryInterpreterSettings;
    pendingMemoryRuleCandidates: PendingMemoryRuleCandidate[];
    approvedMemoryRules: ApprovedMemoryRule[];
    onApproveMemoryRuleCandidate: (candidateId: string) => void;
    onRejectMemoryRuleCandidate: (candidateId: string) => void;
    onUpdateMemoryRuleCandidate: (
      candidateId: string,
      patch: Partial<PendingMemoryRuleCandidate>
    ) => void;
    onDeleteApprovedMemoryRule: (ruleId: string) => void;
  };
};

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
  taskDraftCount: ChatPageGptPanelCompositionArgs["task"]["taskDraftCount"];
  activeTaskDraftIndex: ChatPageGptPanelCompositionArgs["task"]["activeTaskDraftIndex"];
  updateTaskDraftFields: ChatPageGptPanelCompositionArgs["task"]["updateTaskDraftFields"];
  buildTaskRequestAnswerDraft: ChatPageGptPanelCompositionArgs["task"]["buildTaskRequestAnswerDraft"];
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

export type ChatPageWorkspaceViewReferencesArgs = {
  multipartAssemblies: ChatPageGptPanelCompositionArgs["references"]["multipartAssemblies"];
  storedDocuments: ChatPageGptPanelCompositionArgs["references"]["storedDocuments"];
  referenceLibraryItems:
    ChatPageGptPanelCompositionArgs["references"]["referenceLibraryItems"];
  selectedTaskLibraryItemId:
    ChatPageGptPanelCompositionArgs["references"]["selectedTaskLibraryItemId"];
  onDeleteMultipartAssembly:
    ChatPageGptPanelCompositionArgs["references"]["onDeleteMultipartAssembly"];
  onLoadMultipartAssemblyToGptInput:
    ChatPageGptPanelCompositionArgs["references"]["onLoadMultipartAssemblyToGptInput"];
  onDownloadMultipartAssembly:
    ChatPageGptPanelCompositionArgs["references"]["onDownloadMultipartAssembly"];
  onLoadStoredDocumentToGptInput:
    ChatPageGptPanelCompositionArgs["references"]["onLoadStoredDocumentToGptInput"];
  onDownloadStoredDocument:
    ChatPageGptPanelCompositionArgs["references"]["onDownloadStoredDocument"];
  onDeleteStoredDocument:
    ChatPageGptPanelCompositionArgs["references"]["onDeleteStoredDocument"];
  onMoveStoredDocument:
    ChatPageGptPanelCompositionArgs["references"]["onMoveStoredDocument"];
  onMoveLibraryItem:
    ChatPageGptPanelCompositionArgs["references"]["onMoveLibraryItem"];
  onSelectTaskLibraryItem:
    ChatPageGptPanelCompositionArgs["references"]["onSelectTaskLibraryItem"];
  onChangeLibraryItemMode:
    ChatPageGptPanelCompositionArgs["references"]["onChangeLibraryItemMode"];
  onSaveStoredDocument:
    ChatPageGptPanelCompositionArgs["references"]["onSaveStoredDocument"];
  buildLibraryReferenceContext:
    ChatPageControllerServicesSectionArgs["buildLibraryReferenceContext"];
  autoLibraryReferenceEnabled:
    ChatPageGptPanelCompositionArgs["settings"]["autoLibraryReferenceEnabled"];
  onChangeAutoLibraryReferenceEnabled:
    ChatPageGptPanelCompositionArgs["settings"]["onChangeAutoLibraryReferenceEnabled"];
  libraryReferenceMode:
    ChatPageGptPanelCompositionArgs["settings"]["libraryReferenceMode"];
  onChangeLibraryReferenceMode:
    ChatPageGptPanelCompositionArgs["settings"]["onChangeLibraryReferenceMode"];
  libraryIndexResponseCount:
    ChatPageGptPanelCompositionArgs["settings"]["libraryIndexResponseCount"];
  onChangeLibraryIndexResponseCount:
    ChatPageGptPanelCompositionArgs["settings"]["onChangeLibraryIndexResponseCount"];
  libraryReferenceCount:
    ChatPageGptPanelCompositionArgs["settings"]["libraryReferenceCount"];
  onChangeLibraryReferenceCount:
    ChatPageGptPanelCompositionArgs["settings"]["onChangeLibraryReferenceCount"];
  libraryStorageMB: ChatPageGptPanelCompositionArgs["settings"]["libraryStorageMB"];
  libraryReferenceEstimatedTokens:
    ChatPageGptPanelCompositionArgs["settings"]["libraryReferenceEstimatedTokens"];
  googleDriveFolderLink:
    ChatPageGptPanelCompositionArgs["settings"]["googleDriveFolderLink"];
  googleDriveFolderId:
    ChatPageGptPanelCompositionArgs["settings"]["googleDriveFolderId"];
  googleDriveIntegrationMode:
    ChatPageGptPanelCompositionArgs["settings"]["googleDriveIntegrationMode"];
  onChangeGoogleDriveFolderLink:
    ChatPageGptPanelCompositionArgs["settings"]["onChangeGoogleDriveFolderLink"];
  onOpenGoogleDriveFolder:
    ChatPageGptPanelCompositionArgs["settings"]["onOpenGoogleDriveFolder"];
  onImportGoogleDriveFile:
    ChatPageGptPanelCompositionArgs["settings"]["onImportGoogleDriveFile"];
  onIndexGoogleDriveFolder:
    ChatPageGptPanelCompositionArgs["settings"]["onIndexGoogleDriveFolder"];
  onImportGoogleDriveFolder:
    ChatPageGptPanelCompositionArgs["settings"]["onImportGoogleDriveFolder"];
  onShowLibraryItemInChat:
    ChatPageGptPanelCompositionArgs["references"]["onShowLibraryItemInChat"];
  onSendLibraryItemToKin:
    ChatPageGptPanelCompositionArgs["references"]["onSendLibraryItemToKin"];
  onUploadLibraryItemToGoogleDrive:
    ChatPageGptPanelCompositionArgs["references"]["onUploadLibraryItemToGoogleDrive"];
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
  driveImportAutoSummary:
    ChatPageGptPanelCompositionArgs["settings"]["driveImportAutoSummary"];
  onChangeFileReadPolicy:
    ChatPageGptPanelCompositionArgs["settings"]["onChangeFileReadPolicy"];
  onChangeDriveImportAutoSummary:
    ChatPageGptPanelCompositionArgs["settings"]["onChangeDriveImportAutoSummary"];
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

