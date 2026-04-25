import type React from "react";
import type {
  Message,
  ReferenceLibraryItem,
  SourceItem,
  StoredDocument,
} from "@/types/chat";
import type {
  SearchContext,
  SearchEngine,
  SearchMode,
  TaskDraft,
} from "@/types/task";
import type { TaskDraftProtocolProjectionParams } from "@/lib/task/taskDraftProjection";
import type {
  GptInstructionMode,
  GptPanelChatProps,
  UploadKind,
} from "@/components/panels/gpt/gptPanelTypes";
import type { ReasoningMode } from "@/lib/app/task-runtime/reasoningMode";
import type {
  ApprovedIntentPhrase,
  PendingIntentCandidate,
} from "@/lib/task/taskIntent";
import type { TaskCharConstraint } from "@/lib/app/multipart/multipartAssemblyFlow";
import type {
  ChatPanelFocusHandler,
  ChatPanelTab,
} from "@/lib/app/ui-state/panelLayout";
import {
  normalizeUsage,
  type BucketUsageOptions,
  type ConversationUsageOptions,
} from "@/lib/shared/tokenStats";
import type { ChatBridgeSettings } from "@/types/taskProtocol";
import type { useKinTaskProtocol } from "@/hooks/useKinTaskProtocol";
import type {
  GptMemoryRuntime,
  GptMemorySettingsControls,
} from "@/lib/app/ui-state/chatPageGptMemoryControls";
import type { MemoryTopicAdjudication } from "@/lib/app/memory-rules/memoryTopicAdjudication";
import type { ParsedTaskInput } from "@/lib/task/taskInputParser";
import type { MemorySettings } from "@/lib/memory-domain/memory";

type TaskProtocolController = ReturnType<typeof useKinTaskProtocol>;

export type MemoryUpdateOptions = {
  topicAdjudication?: MemoryTopicAdjudication;
  currentTaskTitleOverride?: string;
  lastUserIntent?: string;
  activeDocument?: Record<string, unknown> | null;
  previousCommittedTopic?: string;
};

export type ChatPageIdentityArgs = {
  currentKin: string | null;
  kinList: Array<{ id: string; label: string }>;
  isMobile: boolean;
  setActivePanelTab: React.Dispatch<React.SetStateAction<ChatPanelTab>>;
  focusKinPanel: ChatPanelFocusHandler;
  focusGptPanel: ChatPanelFocusHandler;
  setKinConnectionState: React.Dispatch<
    React.SetStateAction<"idle" | "connected" | "error">
  >;
};

export type ChatPageUiStateArgs = {
  gptInput: string;
  kinInput: string;
  gptLoading: boolean;
  kinLoading: boolean;
  ingestLoading: boolean;
  gptMessages: Message[];
  kinMessages: Message[];
  pendingKinInjectionBlocks: string[];
  pendingKinInjectionIndex: number;
  setKinInput: React.Dispatch<React.SetStateAction<string>>;
  setGptInput: React.Dispatch<React.SetStateAction<string>>;
  setKinMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setGptMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setKinLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setGptLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setIngestLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setPendingKinInjectionBlocks: React.Dispatch<React.SetStateAction<string[]>>;
  setPendingKinInjectionIndex: React.Dispatch<React.SetStateAction<number>>;
};

export type ChatPageTaskArgs = {
  currentTaskDraft: TaskDraft;
  currentTaskIntentConstraints: string[];
  setCurrentTaskDraft: React.Dispatch<React.SetStateAction<TaskDraft>>;
  getTaskBaseText: () => string;
  getTaskLibraryItem: () => ReferenceLibraryItem | null;
  getResolvedTaskTitle: (params: {
    explicitTitle?: string;
    freeText?: string;
    searchQuery?: string;
    fallback?: string;
  }) => string;
  resolveTaskTitleFromDraft: (
    draft: TaskDraft,
    params: {
      explicitTitle?: string;
      freeText?: string;
      searchQuery?: string;
      fallback?: string;
    }
  ) => string;
  getTaskSlotLabel: () => string;
  syncTaskDraftFromProtocol: (
    params: { taskId: string } & TaskDraftProtocolProjectionParams
  ) => void;
  applyPrefixedTaskFieldsFromText: (text: string) => ParsedTaskInput;
  getCurrentTaskCharConstraint: () => TaskCharConstraint | null;
  resetCurrentTaskDraft: () => void;
};

export type ChatPageProtocolArgs = {
  approvedIntentPhrases: ApprovedIntentPhrase[];
  rejectedIntentCandidateSignatures: string[];
  pendingIntentCandidates: PendingIntentCandidate[];
  protocolPrompt: string;
  protocolRulebook: string;
  chatBridgeSettings: ChatBridgeSettings;
  taskProtocol: TaskProtocolController;
  setPendingIntentCandidates: React.Dispatch<
    React.SetStateAction<PendingIntentCandidate[]>
  >;
  setApprovedIntentPhrases: React.Dispatch<
    React.SetStateAction<ApprovedIntentPhrase[]>
  >;
  setRejectedIntentCandidateSignatures: React.Dispatch<
    React.SetStateAction<string[]>
  >;
  setProtocolPrompt: React.Dispatch<React.SetStateAction<string>>;
  setProtocolRulebook: React.Dispatch<React.SetStateAction<string>>;
  promptDefaultKey: string;
  rulebookDefaultKey: string;
};

export type ChatPageSearchArgs = {
  lastSearchContext: SearchContext | null;
  searchMode: SearchMode;
  searchEngines: SearchEngine[];
  searchLocation: string;
  processMultipartTaskDoneText: (
    text: string,
    options?: { setGptTab?: boolean }
  ) => { handled: boolean; accepted: boolean } | null;
  recordSearchContext: (ctx: {
    mode?: SearchMode;
    engines?: SearchEngine[];
    location?: string;
    seriesId?: string;
    continuationToken?: string;
    metadata?: Record<string, unknown>;
    taskId?: string;
    actionId?: string;
    query: string;
    goal?: string;
    outputMode?: "summary" | "raw_and_summary";
    summaryText?: string;
    rawText: string;
    sources: { title: string; link: string }[];
  }) => SearchContext;
  getContinuationTokenForSeries: (seriesId: string) => string;
  getAskAiModeLinkForQuery: (query: string) => string;
  clearSearchHistory: () => void;
  deleteSearchHistoryItemBase: (rawResultId: string) => void;
};

export type ChatPageServicesArgs = {
  reasoningMode: ReasoningMode;
  autoCopyFileIngestSysInfoToKin: boolean;
  autoGenerateFileImportSummary: boolean;
  gptMemoryRuntime: GptMemoryRuntime;
  setUploadKind: React.Dispatch<React.SetStateAction<UploadKind>>;
  applySearchUsage: (stats: Parameters<typeof normalizeUsage>[0]) => void;
  applyChatUsage: (
    stats: Parameters<typeof normalizeUsage>[0],
    options?: ConversationUsageOptions
  ) => void;
  applyCompressionUsage: (stats: Parameters<typeof normalizeUsage>[0]) => void;
  applyTaskUsage: (
    stats: Parameters<typeof normalizeUsage>[0],
    options?: BucketUsageOptions
  ) => void;
  applyIngestUsage: (stats: Parameters<typeof normalizeUsage>[0]) => void;
  buildLibraryReferenceContext: () => string;
  referenceLibraryItems: ReferenceLibraryItem[];
  libraryIndexResponseCount: number;
  recordIngestedDocument: (
    document: Omit<StoredDocument, "id" | "sourceType">
  ) => StoredDocument;
  gptMemorySettingsControls: GptMemorySettingsControls;
  ingestProtocolMessage: (
    text: string,
    direction: "kin_to_gpt" | "gpt_to_kin" | "user_to_kin" | "system"
  ) => void;
};

export type UseChatPageActionsArgs = ChatPageIdentityArgs &
  ChatPageUiStateArgs &
  ChatPageTaskArgs &
  ChatPageProtocolArgs &
  ChatPageSearchArgs &
  ChatPageServicesArgs;

export type ChatPageActionArgGroups = {
  identity: ChatPageIdentityArgs;
  uiState: ChatPageUiStateArgs;
  task: ChatPageTaskArgs;
  protocol: ChatPageProtocolArgs;
  search: ChatPageSearchArgs;
  services: ChatPageServicesArgs;
};

export type UseGptMessageActionsArgs = Pick<
  UseChatPageActionsArgs,
  | "applyChatUsage"
  | "applyPrefixedTaskFieldsFromText"
  | "applySearchUsage"
  | "applyCompressionUsage"
  | "applyIngestUsage"
  | "autoGenerateFileImportSummary"
  | "buildLibraryReferenceContext"
  | "chatBridgeSettings"
  | "currentTaskDraft"
  | "getAskAiModeLinkForQuery"
  | "getContinuationTokenForSeries"
    | "gptInput"
    | "gptLoading"
    | "gptMemoryRuntime"
    | "focusGptPanel"
    | "focusKinPanel"
    | "ingestProtocolMessage"
    | "kinMessages"
  | "lastSearchContext"
  | "libraryIndexResponseCount"
  | "processMultipartTaskDoneText"
  | "recordIngestedDocument"
  | "recordSearchContext"
  | "referenceLibraryItems"
  | "reasoningMode"
    | "searchEngines"
    | "searchLocation"
    | "searchMode"
    | "setGptInput"
    | "setGptLoading"
  | "setGptMessages"
  | "setKinInput"
  | "setPendingKinInjectionBlocks"
  | "setPendingKinInjectionIndex"
  | "taskProtocol"
>;

export type UseKinTransferActionsArgs = Pick<
  UseChatPageActionsArgs,
  | "applyTaskUsage"
  | "approvedIntentPhrases"
  | "currentKin"
  | "currentTaskDraft"
  | "getTaskBaseText"
    | "getTaskSlotLabel"
    | "gptInput"
    | "gptMessages"
    | "focusKinPanel"
    | "ingestProtocolMessage"
    | "isMobile"
  | "kinInput"
  | "kinLoading"
  | "pendingIntentCandidates"
  | "pendingKinInjectionBlocks"
  | "pendingKinInjectionIndex"
  | "processMultipartTaskDoneText"
  | "rejectedIntentCandidateSignatures"
  | "reasoningMode"
  | "setGptInput"
  | "setGptLoading"
  | "setGptMessages"
  | "setKinConnectionState"
  | "setKinInput"
  | "setKinLoading"
  | "setKinMessages"
  | "setPendingIntentCandidates"
  | "setPendingKinInjectionBlocks"
  | "setPendingKinInjectionIndex"
  | "syncTaskDraftFromProtocol"
  | "taskProtocol"
>;

export type UseTaskDraftActionsArgs = Pick<
  UseChatPageActionsArgs,
  | "applyChatUsage"
  | "applyPrefixedTaskFieldsFromText"
  | "applyCompressionUsage"
  | "applyTaskUsage"
  | "currentTaskDraft"
  | "getResolvedTaskTitle"
  | "getTaskBaseText"
  | "getTaskLibraryItem"
  | "gptInput"
  | "gptLoading"
  | "gptMemoryRuntime"
  | "gptMessages"
  | "lastSearchContext"
  | "setCurrentTaskDraft"
  | "setGptInput"
  | "setGptLoading"
  | "setGptMessages"
>;

export type UseTaskProtocolActionsArgs = Pick<
  UseChatPageActionsArgs,
  | "applyTaskUsage"
  | "approvedIntentPhrases"
  | "currentTaskDraft"
  | "focusKinPanel"
  | "pendingIntentCandidates"
  | "promptDefaultKey"
  | "protocolPrompt"
  | "protocolRulebook"
  | "reasoningMode"
  | "rulebookDefaultKey"
  | "setApprovedIntentPhrases"
  | "setGptMessages"
  | "setKinInput"
  | "setPendingIntentCandidates"
  | "setPendingKinInjectionBlocks"
  | "setPendingKinInjectionIndex"
  | "setProtocolPrompt"
  | "setProtocolRulebook"
  | "setRejectedIntentCandidateSignatures"
  | "syncTaskDraftFromProtocol"
  | "taskProtocol"
>;

export type UseFileIngestActionsArgs = Pick<
  UseChatPageActionsArgs,
  | "applyIngestUsage"
  | "autoCopyFileIngestSysInfoToKin"
  | "autoGenerateFileImportSummary"
  | "currentTaskDraft"
  | "getResolvedTaskTitle"
  | "getTaskBaseText"
  | "gptMemoryRuntime"
  | "focusKinPanel"
  | "ingestLoading"
  | "recordIngestedDocument"
  | "resolveTaskTitleFromDraft"
  | "setCurrentTaskDraft"
  | "setGptInput"
  | "setGptMessages"
  | "setIngestLoading"
  | "setKinInput"
  | "setPendingKinInjectionBlocks"
  | "setPendingKinInjectionIndex"
  | "setUploadKind"
>;

export type ChatPageActionGroups = {
  kin: {
    clearPendingKinInjection: () => void;
    runStartKinTaskFromInput: () => Promise<void>;
    sendKinMessage: (text: string) => Promise<void>;
    sendToKin: () => Promise<void>;
    sendLastKinToGptDraft: () => void | Promise<void>;
    sendLastGptToKinDraft: () => void | Promise<void>;
    sendLatestGptContentToKin: () => Promise<void>;
    sendCurrentTaskContentToKin: () => Promise<void>;
  };
  gpt: {
    sendToGpt: (
      instructionMode?: GptInstructionMode
    ) => void | Promise<void>;
    startAskAiModeSearch: (query: string) => void | Promise<void>;
    importYouTubeTranscript: (source: SourceItem) => void | Promise<void>;
    sendYouTubeTranscriptToKin: (source: SourceItem) => void | Promise<void>;
    receiveLastKinResponseToGptInput: () => void | Promise<void>;
    injectFileToKinDraft: GptPanelChatProps["onInjectFile"];
  };
  task: {
    runPrepTaskFromInput: () => void | Promise<void>;
    runUpdateTaskFromInput: () => void | Promise<void>;
    runUpdateTaskFromLastGptMessage: () => void | Promise<void>;
    runAttachSearchResultToTask: () => void | Promise<void>;
    runDeepenTaskFromLast: () => void | Promise<void>;
    prepareTaskRequestAck: (requestId: string) => void;
    prepareTaskSync: (note: string) => void;
    prepareTaskSuspend: (note: string) => void;
  };
  protocol: {
    resetProtocolDefaults: () => void;
    saveProtocolDefaults: () => void;
    approveIntentCandidate: (candidateId: string) => Promise<void>;
    updateIntentCandidate: (
      candidateId: string,
      patch: Partial<PendingIntentCandidate>
    ) => void;
    rejectIntentCandidate: (candidateId: string) => void;
    updateApprovedIntentPhrase: (
      phraseId: string,
      patch: Partial<ApprovedIntentPhrase>
    ) => void;
    deleteApprovedIntentPhrase: (phraseId: string) => void;
    setProtocolRulebookToKinDraft: () => void;
    sendProtocolRulebookToKin: () => Promise<void>;
  };
  memory: {
    handleSaveMemorySettings: (next: MemorySettings) => void;
    handleResetMemorySettings: () => void;
  };
};

