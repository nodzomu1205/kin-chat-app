import type { Dispatch, RefObject, SetStateAction } from "react";
import type { MemorySettings } from "@/lib/memory";
import type {
  Message,
  MultipartAssembly,
  ReferenceLibraryItem,
  StoredDocument,
} from "@/types/chat";
import type { SearchContext, SearchEngine, SearchMode, TaskDraft } from "@/types/task";
import type {
  ApprovedIntentPhrase,
  PendingIntentCandidate,
} from "@/lib/taskIntent";
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

export type ResponseMode = "strict" | "balanced" | "creative";
export type UploadKind = "auto" | "text" | "image" | "pdf" | "mixed";
export type IngestMode = "compact" | "detailed" | "max";
export type ImageDetail = "simple" | "detailed" | "max";
export type DocumentReferenceMode = "summary_only" | "summary_with_excerpt";
export type LibraryReferenceMode = "summary_only" | "summary_with_excerpt";
export type LibraryItemModeOverride = "default" | LibraryReferenceMode;
export type PostIngestAction =
  | "inject_only"
  | "inject_and_prep"
  | "inject_prep_deepen"
  | "attach_to_current_task";
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
  [key: string]: unknown;
};

export type GptStateLike = {
  memory?: {
    facts?: string[];
    preferences?: string[];
    lists?: Record<string, unknown>;
    context?: {
      currentTopic?: string;
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
  resetGptForCurrentKin: () => void;
  loading: boolean;
  gptBottomRef: RefObject<HTMLDivElement | null>;
};

export type GptPanelTaskProps = {
  currentTaskDraft: TaskDraft;
  taskProgressView?: TaskProgressView;
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
  onAnswerTaskRequest?: (requestId: string) => void;
  onPrepareTaskRequestAck?: (requestId: string) => void;
  onPrepareTaskSync?: (note: string) => void;
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
  onSaveStoredDocument: (
    documentId: string,
    patch: Partial<Pick<StoredDocument, "title" | "text" | "summary">>
  ) => void;
};

export type GptPanelSettingsProps = {
  memorySettings: MemorySettings;
  defaultMemorySettings: MemorySettings;
  tokenStats: TokenStats;
  responseMode: ResponseMode;
  uploadKind: UploadKind;
  ingestMode: IngestMode;
  imageDetail: ImageDetail;
  postIngestAction: PostIngestAction;
  fileReadPolicy: FileReadPolicy;
  compactCharLimit: number;
  simpleImageCharLimit: number;
  ingestLoading: boolean;
  canInjectFile: boolean;
  searchMode: SearchMode;
  searchEngines: SearchEngine[];
  searchLocation: string;
  searchHistoryLimit: number;
  searchHistoryStorageMB: number;
  autoDocumentReferenceEnabled: boolean;
  documentReferenceMode: DocumentReferenceMode;
  documentReferenceCount: number;
  documentStorageMB: number;
  documentReferenceEstimatedTokens: number;
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
  onSaveMemorySettings: (next: MemorySettings) => void;
  onResetMemorySettings: () => void;
  onChangeResponseMode: (value: ResponseMode) => void;
  onChangeUploadKind: (value: UploadKind) => void;
  onChangeIngestMode: (value: IngestMode) => void;
  onChangeImageDetail: (value: ImageDetail) => void;
  onChangeCompactCharLimit: (value: number) => void;
  onChangeSimpleImageCharLimit: (value: number) => void;
  onChangePostIngestAction: (value: PostIngestAction) => void;
  onChangeFileReadPolicy: (value: FileReadPolicy) => void;
  onChangeSearchMode: (value: SearchMode) => void;
  onChangeSearchEngines: (value: SearchEngine[]) => void;
  onChangeSearchLocation: (value: string) => void;
  onChangeSearchHistoryLimit: (value: number) => void;
  onClearSearchHistory: () => void;
  onChangeAutoDocumentReferenceEnabled: (value: boolean) => void;
  onChangeDocumentReferenceMode: (value: DocumentReferenceMode) => void;
  onChangeDocumentReferenceCount: (value: number) => void;
  onChangeAutoLibraryReferenceEnabled: (value: boolean) => void;
  onChangeLibraryReferenceMode: (value: LibraryReferenceMode) => void;
  onChangeLibraryIndexResponseCount: (value: number) => void;
  onChangeLibraryReferenceCount: (value: number) => void;
  onChangeAutoSendKinSysInput: (value: boolean) => void;
  onChangeAutoCopyKinSysResponseToGpt: (value: boolean) => void;
  onChangeAutoSendGptSysInput: (value: boolean) => void;
  onChangeAutoCopyGptSysResponseToKin: (value: boolean) => void;
};

export type GptPanelProps = {
  currentKin: string | null;
  currentKinLabel: string | null;
  kinStatus: string;
  gptState: GptStateLike;
  gptMessages: Message[];
  gptInput: string;
  setGptInput: Dispatch<SetStateAction<string>>;
  sendToGpt: (instructionMode?: GptInstructionMode) => void | Promise<void>;
  runPrepTaskFromInput: () => void | Promise<void>;
  runDeepenTaskFromLast: () => void | Promise<void>;
  runUpdateTaskFromInput: () => void | Promise<void>;
  runUpdateTaskFromLastGptMessage: () => void | Promise<void>;
  runAttachSearchResultToTask: () => void | Promise<void>;
  sendLatestGptContentToKin: () => void | Promise<void>;
  sendCurrentTaskContentToKin: () => void | Promise<void>;
  receiveLastKinResponseToGptInput: () => void | Promise<void>;
  resetGptForCurrentKin: () => void;
  sendLastGptToKinDraft: () => void | Promise<void>;
  injectFileToKinDraft: (
    file: File,
    options: {
      kind: UploadKind;
      mode: IngestMode;
      detail: ImageDetail;
      action: PostIngestAction;
      readPolicy: FileReadPolicy;
      compactCharLimit: number;
      simpleImageCharLimit: number;
    }
  ) => void | Promise<void>;
  canInjectFile: boolean;
  loading: boolean;
  ingestLoading: boolean;
  gptBottomRef: RefObject<HTMLDivElement | null>;
  memorySettings: MemorySettings;
  defaultMemorySettings: MemorySettings;
  onSaveMemorySettings: (next: MemorySettings) => void;
  onResetMemorySettings: () => void;
  tokenStats: TokenStats;
  responseMode: ResponseMode;
  onChangeResponseMode: (value: ResponseMode) => void;
  uploadKind: UploadKind;
  ingestMode: IngestMode;
  imageDetail: ImageDetail;
  postIngestAction: PostIngestAction;
  fileReadPolicy: FileReadPolicy;
  onChangeUploadKind: (value: UploadKind) => void;
  onChangeIngestMode: (value: IngestMode) => void;
  onChangeImageDetail: (value: ImageDetail) => void;
  compactCharLimit: number;
  simpleImageCharLimit: number;
  onChangeCompactCharLimit: (value: number) => void;
  onChangeSimpleImageCharLimit: (value: number) => void;
  onChangePostIngestAction: (value: PostIngestAction) => void;
  onChangeFileReadPolicy: (value: FileReadPolicy) => void;
  searchMode: SearchMode;
  searchEngines: SearchEngine[];
  searchLocation: string;
  searchHistoryLimit: number;
  searchHistoryStorageMB: number;
  autoDocumentReferenceEnabled: boolean;
  documentReferenceMode: DocumentReferenceMode;
  documentReferenceCount: number;
  documentStorageMB: number;
  documentReferenceEstimatedTokens: number;
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
  onChangeSearchMode: (value: SearchMode) => void;
  onChangeSearchEngines: (value: SearchEngine[]) => void;
  onChangeSearchLocation: (value: string) => void;
  onChangeSearchHistoryLimit: (value: number) => void;
  onClearSearchHistory: () => void;
  onChangeAutoDocumentReferenceEnabled: (value: boolean) => void;
  onChangeDocumentReferenceMode: (value: DocumentReferenceMode) => void;
  onChangeDocumentReferenceCount: (value: number) => void;
  onChangeAutoLibraryReferenceEnabled: (value: boolean) => void;
  onChangeLibraryReferenceMode: (value: LibraryReferenceMode) => void;
  onChangeLibraryIndexResponseCount: (value: number) => void;
  onChangeLibraryReferenceCount: (value: number) => void;
  onChangeAutoSendKinSysInput: (value: boolean) => void;
  onChangeAutoCopyKinSysResponseToGpt: (value: boolean) => void;
  onChangeAutoSendGptSysInput: (value: boolean) => void;
  onChangeAutoCopyGptSysResponseToKin: (value: boolean) => void;
  onDeleteSearchHistoryItem: (rawResultId: string) => void;
  multipartAssemblies: MultipartAssembly[];
  onLoadMultipartAssemblyToGptInput: (assemblyId: string) => void;
  onDownloadMultipartAssembly: (assemblyId: string) => void;
  onDeleteMultipartAssembly: (assemblyId: string) => void;
  storedDocuments: StoredDocument[];
  referenceLibraryItems: ReferenceLibraryItem[];
  selectedTaskLibraryItemId: string;
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
  onSaveStoredDocument: (
    documentId: string,
    patch: Partial<Pick<StoredDocument, "title" | "text" | "summary">>
  ) => void;
  pendingIntentCandidates: PendingIntentCandidate[];
  approvedIntentPhrases: ApprovedIntentPhrase[];
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
  lastSearchContext: SearchContext | null;
  searchHistory: SearchContext[];
  selectedTaskSearchResultId: string;
  onSelectTaskSearchResult: (rawResultId: string) => void;
  onMoveSearchHistoryItem: (
    rawResultId: string,
    direction: "up" | "down"
  ) => void;
  pendingInjectionCurrentPart: number;
  pendingInjectionTotalParts: number;
  onSwitchPanel: () => void;
  isMobile: boolean;
  currentTaskDraft: TaskDraft;
  onChangeTaskTitle: (value: string) => void;
  onChangeTaskUserInstruction: (value: string) => void;
  onChangeTaskBody: (value: string) => void;
  protocolPrompt: string;
  protocolRulebook: string;
  onChangeProtocolPrompt: (value: string) => void;
  onChangeProtocolRulebook: (value: string) => void;
  onResetProtocolDefaults: () => void;
  onSaveProtocolDefaults: () => void;
  onSetProtocolRulebookToKinDraft: () => void | Promise<void>;
  onSendProtocolRulebookToKin: () => void | Promise<void>;
  taskProgressView?: TaskProgressView;
  onAnswerTaskRequest?: (requestId: string) => void;
  onPrepareTaskRequestAck?: (requestId: string) => void;
  onPrepareTaskSync?: (note: string) => void;
  onStartKinTask?: () => void | Promise<void>;
  onResetTaskContext?: () => void;
  header?: GptPanelHeaderProps;
  chat?: GptPanelChatProps;
  task?: GptPanelTaskProps;
  protocol?: GptPanelProtocolProps;
  references?: GptPanelReferenceProps;
  settings?: GptPanelSettingsProps;
};
