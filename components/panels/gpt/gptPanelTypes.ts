import type { Dispatch, RefObject, SetStateAction } from "react";
import type { MemorySettings } from "@/lib/memory";
import type { ChatPromptMetrics } from "@/lib/chatPromptMetrics";
import type {
  Message,
  MultipartAssembly,
  ReferenceLibraryItem,
  SourceItem,
  StoredDocument,
} from "@/types/chat";
import type { SearchContext, SearchEngine, SearchMode, TaskDraft } from "@/types/task";
import type {
  ApprovedIntentPhrase,
  PendingIntentCandidate,
} from "@/lib/taskIntent";
import type {
  ApprovedMemoryRule,
  MemoryInterpreterSettings,
  PendingMemoryRuleCandidate,
} from "@/lib/memoryInterpreterRules";
import type {
  TaskRequirementProgress,
  TaskExecutionStatus,
  UserFacingTaskRequest,
} from "@/types/taskProtocol";

export type GptInstructionMode =
  | "normal"
  | "translate_explain"
  | "reply_only"
  | "polish";

export type ResponseMode = "strict" | "creative";
export type UploadKind = "auto" | "text" | "image" | "pdf" | "mixed";
export type IngestMode = "compact" | "detailed" | "max";
export type ImageDetail = "simple" | "detailed" | "max";
export type LibraryReferenceMode = "summary_only" | "summary_with_excerpt";
export type LibraryItemModeOverride = "default" | LibraryReferenceMode;
export type FileReadPolicy = "text_first" | "visual_first" | "text_and_layout";

export type TokenTriplet = {
  input?: number;
  output?: number;
  total?: number;
};

export type TokenStats = {
  latestInput?: number;
  latestOutput?: number;
  latestTotal?: number;
  rolling5Input?: number;
  rolling5Output?: number;
  rolling5Total?: number;
  cumulativeInput?: number;
  cumulativeOutput?: number;
  cumulativeTotal?: number;
  latest?: TokenTriplet;
  rolling5?: TokenTriplet;
  cumulative?: TokenTriplet;
  lastChatPromptMetrics?: ChatPromptMetrics | null;
  lastChatFollowupMetrics?: {
    promptChars: number;
    rawReplyChars: number;
  } | null;
  lastChatUsageDetails?: Record<string, unknown> | null;
  lastChatFollowupUsageDetails?: Record<string, unknown> | null;
  lastChatFollowupDebug?: {
    prompt: string;
    rawReply: string;
    parsed: unknown;
    usageDetails?: Record<string, unknown> | null;
  } | null;
  [key: string]: unknown;
};

export type GptStateLike = {
  memory?: {
    facts?: string[];
    preferences?: string[];
    lists?: Record<string, unknown>;
    context?: {
      currentTopic?: string;
      proposedTopic?: string;
      currentTask?: string;
      followUpRule?: string;
      lastUserIntent?: string;
    };
  };
  recentMessages?: Message[];
};

export type TaskProgressView = {
  taskId: string | null;
  taskTitle: string;
  goal: string;
  taskStatus: TaskExecutionStatus;
  latestSummary: string;
  requirementProgress: TaskRequirementProgress[];
  userFacingRequests: UserFacingTaskRequest[];
};

export type GptPanelHeaderProps = {
  currentKin: string | null;
  currentKinLabel: string | null;
  kinStatus: string;
  isMobile: boolean;
  onSwitchPanel: () => void;
};

export type GptPanelChatProps = {
  gptState: GptStateLike;
  gptMessages: Message[];
  gptInput: string;
  setGptInput: Dispatch<SetStateAction<string>>;
  sendToGpt: (instructionMode?: GptInstructionMode) => void | Promise<void>;
  onInjectFile: (
    file: File,
    options: {
      kind: UploadKind;
      mode: IngestMode;
      detail: ImageDetail;
      readPolicy: FileReadPolicy;
      compactCharLimit: number;
      simpleImageCharLimit: number;
    }
  ) => void | Promise<void>;
  resetGptForCurrentKin: () => void;
  loading: boolean;
  gptBottomRef: RefObject<HTMLDivElement | null>;
};

export type GptPanelTaskProps = {
  currentTaskDraft: TaskDraft;
  taskDraftCount: number;
  activeTaskDraftIndex: number;
  taskProgressView?: TaskProgressView;
  taskProgressCount: number;
  activeTaskProgressIndex: number;
  pendingInjectionCurrentPart: number;
  pendingInjectionTotalParts: number;
  runPrepTaskFromInput: () => void | Promise<void>;
  runDeepenTaskFromLast: () => void | Promise<void>;
  runUpdateTaskFromInput: () => void | Promise<void>;
  runUpdateTaskFromLastGptMessage: () => void | Promise<void>;
  runAttachSearchResultToTask: () => void | Promise<void>;
  sendLatestGptContentToKin: () => void | Promise<void>;
  sendCurrentTaskContentToKin: () => void | Promise<void>;
  receiveLastKinResponseToGptInput: () => void | Promise<void>;
  sendLastGptToKinDraft: () => void | Promise<void>;
  onChangeTaskTitle: (value: string) => void;
  onChangeTaskUserInstruction: (value: string) => void;
  onChangeTaskBody: (value: string) => void;
  onSaveTaskSnapshot?: () => void;
  onSelectPreviousTaskDraft?: () => void;
  onSelectNextTaskDraft?: () => void;
  onAnswerTaskRequest?: (requestId: string) => void;
  onPrepareTaskRequestAck?: (requestId: string) => void;
  onPrepareTaskSync?: (note: string) => void;
  onPrepareTaskSuspend?: (note: string) => void;
  onUpdateTaskProgressCounts?: (params: {
    requirementId: string;
    completedCount: number;
    targetCount?: number;
  }) => void;
  onClearTaskProgress?: (taskId: string) => void;
  onSelectPreviousTaskProgress?: () => void;
  onSelectNextTaskProgress?: () => void;
  onStartKinTask?: () => void | Promise<void>;
  onResetTaskContext?: () => void;
};

export type GptPanelProtocolProps = {
  protocolPrompt: string;
  protocolRulebook: string;
  pendingIntentCandidates: PendingIntentCandidate[];
  approvedIntentPhrases: ApprovedIntentPhrase[];
  onChangeProtocolPrompt: (value: string) => void;
  onChangeProtocolRulebook: (value: string) => void;
  onResetProtocolDefaults: () => void;
  onSaveProtocolDefaults: () => void;
  onSetProtocolRulebookToKinDraft: () => void | Promise<void>;
  onSendProtocolRulebookToKin: () => void | Promise<void>;
  onUpdateIntentCandidate: (
    candidateId: string,
    patch: Partial<PendingIntentCandidate>
  ) => void;
  onApproveIntentCandidate: (candidateId: string) => void;
  onRejectIntentCandidate: (candidateId: string) => void;
  onUpdateApprovedIntentPhrase: (
    phraseId: string,
    patch: Partial<ApprovedIntentPhrase>
  ) => void;
  onDeleteApprovedIntentPhrase: (phraseId: string) => void;
};

export type GptPanelReferenceProps = {
  lastSearchContext: SearchContext | null;
  searchHistory: SearchContext[];
  selectedTaskSearchResultId: string;
  multipartAssemblies: MultipartAssembly[];
  storedDocuments: StoredDocument[];
  referenceLibraryItems: ReferenceLibraryItem[];
  selectedTaskLibraryItemId: string;
  onSelectTaskSearchResult: (rawResultId: string) => void;
  onMoveSearchHistoryItem: (
    rawResultId: string,
    direction: "up" | "down"
  ) => void;
  onDeleteSearchHistoryItem: (rawResultId: string) => void;
  onLoadMultipartAssemblyToGptInput: (assemblyId: string) => void;
  onDownloadMultipartAssembly: (assemblyId: string) => void;
  onDeleteMultipartAssembly: (assemblyId: string) => void;
  onLoadStoredDocumentToGptInput: (documentId: string) => void;
  onDownloadStoredDocument: (documentId: string) => void;
  onDeleteStoredDocument: (documentId: string) => void;
  onMoveStoredDocument: (documentId: string, direction: "up" | "down") => void;
  onMoveLibraryItem: (itemId: string, direction: "up" | "down") => void;
  onSelectTaskLibraryItem: (itemId: string) => void;
  onChangeLibraryItemMode: (
    itemId: string,
    mode: LibraryItemModeOverride
  ) => void;
  onStartAskAiModeSearch: (query: string) => void | Promise<void>;
  onImportYouTubeTranscript: (source: SourceItem) => void | Promise<void>;
  onSendYouTubeTranscriptToKin: (source: SourceItem) => void | Promise<void>;
  onSaveStoredDocument: (
    documentId: string,
    patch: Partial<Pick<StoredDocument, "title" | "text" | "summary">>
  ) => void;
  onShowLibraryItemInChat: (itemId: string) => void;
  onSendLibraryItemToKin: (itemId: string) => void | Promise<void>;
  onUploadLibraryItemToGoogleDrive: (itemId: string) => void | Promise<void>;
};

export type GptPanelSettingsProps = {
  currentTopic?: string;
  memorySettings: MemorySettings;
  defaultMemorySettings: MemorySettings;
  tokenStats: TokenStats;
  responseMode: ResponseMode;
  uploadKind: UploadKind;
  ingestMode: IngestMode;
  imageDetail: ImageDetail;
  fileReadPolicy: FileReadPolicy;
  driveImportAutoSummary: boolean;
  compactCharLimit: number;
  simpleImageCharLimit: number;
  ingestLoading: boolean;
  canInjectFile: boolean;
  searchMode: SearchMode;
  searchEngines: SearchEngine[];
  searchLocation: string;
  sourceDisplayCount: number;
  autoLibraryReferenceEnabled: boolean;
  libraryReferenceMode: LibraryReferenceMode;
  libraryIndexResponseCount: number;
  libraryReferenceCount: number;
  libraryStorageMB: number;
  libraryReferenceEstimatedTokens: number;
  autoSendKinSysInput: boolean;
  autoCopyKinSysResponseToGpt: boolean;
  autoSendGptSysInput: boolean;
  autoCopyGptSysResponseToKin: boolean;
  autoCopyFileIngestSysInfoToKin: boolean;
  googleDriveFolderLink: string;
  googleDriveFolderId: string;
  googleDriveIntegrationMode: "manual_link" | "picker";
  memoryInterpreterSettings: MemoryInterpreterSettings;
  pendingMemoryRuleCandidates: PendingMemoryRuleCandidate[];
  approvedMemoryRules: ApprovedMemoryRule[];
  onSaveMemorySettings: (next: MemorySettings) => void;
  onResetMemorySettings: () => void;
  onChangeResponseMode: (value: ResponseMode) => void;
  onChangeUploadKind: (value: UploadKind) => void;
  onChangeIngestMode: (value: IngestMode) => void;
  onChangeImageDetail: (value: ImageDetail) => void;
  onChangeCompactCharLimit: (value: number) => void;
  onChangeSimpleImageCharLimit: (value: number) => void;
  onChangeFileReadPolicy: (value: FileReadPolicy) => void;
  onChangeDriveImportAutoSummary: (value: boolean) => void;
  onChangeSearchMode: (value: SearchMode) => void;
  onChangeSearchEngines: (value: SearchEngine[]) => void;
  onChangeSearchLocation: (value: string) => void;
  onChangeSourceDisplayCount: (value: number) => void;
  onChangeAutoLibraryReferenceEnabled: (value: boolean) => void;
  onChangeLibraryReferenceMode: (value: LibraryReferenceMode) => void;
  onChangeLibraryIndexResponseCount: (value: number) => void;
  onChangeLibraryReferenceCount: (value: number) => void;
  onChangeAutoSendKinSysInput: (value: boolean) => void;
  onChangeAutoCopyKinSysResponseToGpt: (value: boolean) => void;
  onChangeAutoSendGptSysInput: (value: boolean) => void;
  onChangeAutoCopyGptSysResponseToKin: (value: boolean) => void;
  onChangeAutoCopyFileIngestSysInfoToKin: (value: boolean) => void;
  onChangeGoogleDriveFolderLink: (value: string) => void;
  onOpenGoogleDriveFolder: () => void;
  onImportGoogleDriveFile: () => void | Promise<void>;
  onIndexGoogleDriveFolder: () => void | Promise<void>;
  onImportGoogleDriveFolder: () => void | Promise<void>;
  onChangeMemoryInterpreterSettings: (
    patch: Partial<MemoryInterpreterSettings>
  ) => void;
  onApproveMemoryRuleCandidate: (candidateId: string) => void;
  onRejectMemoryRuleCandidate: (candidateId: string) => void;
  onUpdateMemoryRuleCandidate: (
    candidateId: string,
    patch: Partial<PendingMemoryRuleCandidate>
  ) => void;
  onDeleteApprovedMemoryRule: (ruleId: string) => void;
};

export type GptPanelProps = {
  header: GptPanelHeaderProps;
  chat: GptPanelChatProps;
  task: GptPanelTaskProps;
  protocol: GptPanelProtocolProps;
  references: GptPanelReferenceProps;
  settings: GptPanelSettingsProps;
};
