import type { Message, SourceItem } from "@/types/chat";
import type { SearchEngine, SearchMode } from "@/types/task";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Memory } from "@/lib/memory";
import type { MemoryUpdateOptions } from "@/hooks/chatPageActionTypes";
import type { GptInstructionMode, ResponseMode } from "@/components/panels/gpt/gptPanelTypes";
import type { ReferenceLibraryItem } from "@/types/chat";
import type { TaskProtocolEvent, TaskRuntimeState } from "@/types/taskProtocol";
import type { ConversationUsageOptions } from "@/lib/tokenStats";
import type { ChatPromptMetrics } from "@/lib/chatPromptMetrics";

export type ParsedInputLike = {
  searchQuery?: string;
  freeText?: string;
  title?: string;
  userInstruction?: string;
};

export type PendingRequestLike = {
  id: string;
  taskId: string;
  actionId: string;
  body: string;
};

export type WrappedSearchResponse = {
  query?: string;
  outputMode?: string;
  summary?: string;
  rawExcerpt?: string;
} | null;

export type SearchRecord = {
  rawResultId: string;
};

export type SearchSource = {
  title?: string;
  link?: string;
  snippet?: string;
  sourceType?: string;
  publishedAt?: string;
  thumbnailUrl?: string;
  channelName?: string;
  duration?: string;
  viewCount?: string;
  videoId?: string;
};

export type ChatApiSearchLike = {
  reply?: string;
  usage?: Parameters<typeof import("@/lib/tokenStats").normalizeUsage>[0];
  usageDetails?: Record<string, unknown> | null;
  promptMetrics?: ChatPromptMetrics | null;
  searchUsed?: boolean;
  searchQuery?: string;
  searchSeriesId?: string;
  searchContinuationToken?: string;
  searchEvidence?: string;
  sources?: SearchSource[];
};

export type ChatApiRequestPayload = {
  mode: "chat";
  memory: unknown;
  recentMessages: Message[];
  input: string;
  storedSearchContext: string;
  storedDocumentContext: string;
  storedLibraryContext: string;
  forcedSearchQuery?: string;
  searchSeriesId?: string;
  searchContinuationToken?: string;
  searchAskAiModeLink?: string;
  searchMode: SearchMode;
  searchEngines: SearchEngine[];
  searchLocation: string;
  instructionMode: string;
  reasoningMode: string;
};

export type ProtocolLimitEvent = {
  type:
    | "ask_gpt"
    | "search_request"
    | "user_question"
    | "library_reference"
    | "youtube_transcript_request";
  taskId?: string;
  actionId?: string;
};

export type ProtocolTaskEventLike = {
  taskId?: string;
  actionId?: string;
  body?: string;
  summary?: string;
  query?: string;
  searchEngine?: string;
  searchLocation?: string;
  outputMode?: string;
};

export type SearchResponseEventLike = {
  taskId?: string;
  actionId?: string;
  body?: string;
  summary?: string;
  query?: string;
  searchEngine?: string;
  searchLocation?: string;
  outputMode?: string;
};

export type GptStateSnapshotLike = {
  recentMessages?: Message[];
  memory?: {
    context?: {
      currentTopic?: string;
    };
  };
};

export type SearchContextRecorder = (args: {
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
  sources: SourceItem[];
}) => SearchRecord;

export type MemoryResultLike = {
  compressionUsage?: Parameters<typeof import("@/lib/tokenStats").normalizeUsage>[0];
  fallbackUsage?: Parameters<typeof import("@/lib/tokenStats").normalizeUsage>[0];
  fallbackUsageDetails?: Record<string, unknown> | null;
  fallbackMetrics?: {
    promptChars: number;
    rawReplyChars: number;
  } | null;
};

export type SendToGptFlowSearchArgs = {
  searchMode: SearchMode;
  searchEngines: SearchEngine[];
  searchLocation: string;
  parseWrappedSearchResponse: (text: string) => WrappedSearchResponse;
  recordSearchContext: SearchContextRecorder;
  getContinuationTokenForSeries: (seriesId: string) => string;
  getAskAiModeLinkForQuery: (query: string) => string;
  applySearchUsage: (usage: Parameters<typeof import("@/lib/tokenStats").normalizeUsage>[0]) => void;
  applyChatUsage: (
    usage: Parameters<typeof import("@/lib/tokenStats").normalizeUsage>[0],
    options?: ConversationUsageOptions
  ) => void;
};

export type SendToGptFlowProtocolArgs = {
  taskProtocolRuntime: TaskRuntimeState;
  currentTaskId: string | null;
  findPendingRequest: (requestId: string) => PendingRequestLike | null;
  applyPrefixedTaskFieldsFromText: (text: string) => ParsedInputLike;
  getProtocolLimitViolation: (event: ProtocolLimitEvent) => string | null;
  shouldInjectTaskContextWithSettings: (userInput: string) => boolean;
  referenceLibraryItems: ReferenceLibraryItem[];
  libraryIndexResponseCount: number;
  buildLibraryReferenceContext: () => string;
  taskProtocolAnswerPendingRequest: (requestId: string, answerText: string) => void;
  ingestProtocolMessage: (
    text: string,
    direction: "kin_to_gpt" | "gpt_to_kin" | "user_to_kin" | "system"
  ) => void;
};

export type SendToGptFlowMemoryArgs = {
  handleGptMemory: (
    recent: Message[],
    options?: MemoryUpdateOptions
  ) => Promise<MemoryResultLike>;
  applyCompressionUsage: (usage: Parameters<typeof import("@/lib/tokenStats").normalizeUsage>[0]) => void;
  chatRecentLimit: number;
  gptStateRef: MutableRefObject<{ recentMessages?: Message[]; memory?: Memory }>;
};

export type SendToGptFlowUiArgs = {
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
  setGptInput: Dispatch<SetStateAction<string>>;
  setGptLoading: Dispatch<SetStateAction<boolean>>;
  setKinInput: Dispatch<SetStateAction<string>>;
  setPendingKinInjectionBlocks: Dispatch<SetStateAction<string[]>>;
  setPendingKinInjectionIndex: Dispatch<SetStateAction<number>>;
  setActiveTabToKin?: () => void;
};

export type SendToGptFlowRequestArgs = {
  gptInput: string;
  gptLoading: boolean;
  instructionMode?: GptInstructionMode;
  responseMode: ResponseMode;
  processMultipartTaskDoneText: (
    text: string,
    options?: { setGptTab?: boolean }
  ) => { handled: boolean; accepted: boolean } | null;
  recordIngestedDocument: (document: {
    title: string;
    filename: string;
    text: string;
    summary?: string;
    taskId?: string;
    charCount: number;
    createdAt: string;
    updatedAt: string;
  }) => { id: string };
  onHandleYoutubeTranscriptRequest?: (params: {
    userMessage: Message;
    youtubeTranscriptRequestEvent: TaskProtocolEvent;
    currentTaskId: string | null;
  }) => Promise<boolean>;
};

export type PreparedRequestGateContext = {
  parsedInput: ParsedInputLike;
  effectiveParsedSearchQuery: string;
  limitViolation: string | null;
  userMsg: Message;
  youtubeTranscriptRequestEvent?: TaskProtocolEvent & { url?: string };
};

export type PreparedRequestExecutionContext = {
  finalRequestText: string;
  storedDocumentContext: string;
  storedLibraryContext: string;
  cleanQuery?: string;
  searchRequestEvent?: SearchResponseEventLike;
  effectiveParsedSearchQuery: string;
  searchSeriesId?: string;
  continuationToken?: string;
  askAiModeLink?: string;
  effectiveSearchMode: SearchMode;
  effectiveSearchEngines: SearchEngine[];
  effectiveSearchLocation: string;
  askGptEvent?: ProtocolTaskEventLike;
  requestToAnswer?: PendingRequestLike | null;
  requestAnswerBody?: string;
};

export type PreparedRequestContextSource = PreparedRequestGateContext & {
  finalRequestText: string;
  effectiveDocumentReferenceContext: string;
  libraryReferenceContext: string;
  continuationDetails: {
    cleanQuery?: string;
  };
  searchRequestEvent?: SearchResponseEventLike;
  effectiveParsedSearchQuery: string;
  searchSeriesId?: string;
  continuationToken?: string;
  askAiModeLink?: string;
  effectiveSearchMode: SearchMode;
  effectiveSearchEngines: SearchEngine[];
  effectiveSearchLocation: string;
  askGptEvent?: ProtocolTaskEventLike;
  requestToAnswer?: PendingRequestLike | null;
  requestAnswerBody?: string;
};

export type PreparedRequestFinalizeContext = {
  searchRequestEvent?: SearchResponseEventLike;
  effectiveSearchMode: SearchMode;
  effectiveSearchEngines: SearchEngine[];
  effectiveSearchLocation: string;
  searchSeriesId?: string;
  cleanQuery?: string;
  effectiveParsedSearchQuery: string;
  finalRequestText: string;
  requestToAnswer?: PendingRequestLike | null;
  requestAnswerBody?: string;
};

export type TaskDirectiveOnlyGateContext = {
  isTaskDirectiveOnly: boolean;
};

export type ProtocolLimitViolationGateContext = {
  limitViolation: string | null;
  userMsg: Message;
};

export type YoutubeTranscriptGateContext = {
  youtubeTranscriptRequestEvent?: TaskProtocolEvent & { url?: string };
  userMsg: Message;
};

export type MultipartImportGateContext = {
  multipartHandled: boolean;
};

export type InlineUrlGateContext = {
  inlineUrlTarget: string | null;
};

export type SendToGptMemoryPreparation = {
  memoryContext: {
    baseRecent: Message[];
    recentWithUser: Message[];
    previousCommittedTopic?: string;
  };
  requestMemory: Memory;
};

export type SendToGptImplicitSearchArtifactsArgs = {
  data: ChatApiSearchLike;
  searchRequestEvent?: SearchResponseEventLike;
  effectiveSearchMode: SearchMode;
  effectiveSearchEngines: SearchEngine[];
  effectiveSearchLocation: string;
  searchSeriesId?: string;
  cleanQuery?: string;
  effectiveParsedSearchQuery?: string;
  finalRequestText: string;
  applySearchUsage: (usage: Parameters<typeof import("@/lib/tokenStats").normalizeUsage>[0]) => void;
  applyChatUsage: (
    usage: Parameters<typeof import("@/lib/tokenStats").normalizeUsage>[0],
    options?: ConversationUsageOptions
  ) => void;
  recordSearchContext: SearchContextRecorder;
};

export type ProtocolInteractionContext = {
  protocolEvents: ReturnType<typeof import("@/lib/taskRuntimeProtocol").extractTaskProtocolEvents>;
  askGptEvent?: ProtocolTaskEventLike;
  searchRequestEvent?: SearchResponseEventLike;
  youtubeTranscriptRequestEvent?: TaskProtocolEvent & { url?: string };
  libraryIndexRequestEvent?: SearchResponseEventLike;
  libraryItemRequestEvent?: SearchResponseEventLike;
  userQuestionEvent?: ProtocolTaskEventLike;
  requestToAnswer?: PendingRequestLike | null;
  requestAnswerBody?: string;
};

export type DerivedSearchContext = {
  inlineSearchQuery: string;
  effectiveParsedSearchQuery: string;
  continuationDetails: ReturnType<
    typeof import("@/lib/search-domain/continuations").parseSearchContinuation
  >;
  effectiveSearchMode: SearchMode;
  effectiveSearchEngines: SearchEngine[];
  effectiveSearchLocation: string;
  searchSeriesId?: string;
  continuationToken?: string;
  askAiModeLink?: string;
};

export type GptAssistantRequestPayloadArgs = {
  requestMemory: Memory;
  recentMessages: Message[];
  finalRequestText: string;
  storedDocumentContext: string;
  storedLibraryContext: string;
  cleanQuery?: string;
  searchRequestEvent?: SearchResponseEventLike;
  effectiveParsedSearchQuery: string;
  searchSeriesId?: string;
  continuationToken?: string;
  askAiModeLink?: string;
  effectiveSearchMode: SearchMode;
  effectiveSearchEngines: SearchEngine[];
  effectiveSearchLocation: string;
  instructionMode: string;
  responseMode: string;
};

export type RequestGptAssistantArtifactsArgs = GptAssistantRequestPayloadArgs & {
  parseWrappedSearchResponse: (text: string) => WrappedSearchResponse;
  askGptEvent?: ProtocolTaskEventLike;
  currentTaskId?: string | null;
  requestToAnswer?: PendingRequestLike | null;
  requestAnswerBody?: string;
  recordSearchContext: SearchContextRecorder;
};

export type ProtocolSearchResponseArtifactsArgs = {
  data: ChatApiSearchLike;
  searchRequestEvent: SearchResponseEventLike;
  currentTaskId?: string | null;
  wrappedSearchResponse: WrappedSearchResponse;
  effectiveSearchMode: SearchMode;
  effectiveSearchEngines: SearchEngine[];
  effectiveSearchLocation: string;
  searchSeriesId?: string;
  cleanQuery?: string;
  recordSearchContext: SearchContextRecorder;
};

export type FinalizeSendToGptFlowArgs = {
  data: ChatApiSearchLike;
  assistantText: string;
  normalizedSources: SourceItem[];
  memoryContext: {
    recentWithUser: Message[];
    previousCommittedTopic?: string;
  };
  chatRecentLimit: number;
  preparedRequest: PreparedRequestFinalizeContext;
  ingestProtocolMessage: (
    text: string,
    direction: "kin_to_gpt" | "gpt_to_kin" | "user_to_kin" | "system"
  ) => void;
  taskProtocolAnswerPendingRequest: (requestId: string, answerText: string) => void;
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
  applySearchUsage: (usage: ChatApiSearchLike["usage"]) => void;
  applyChatUsage: (
    usage: ChatApiSearchLike["usage"],
    options?: ConversationUsageOptions
  ) => void;
  recordSearchContext: SearchContextRecorder;
  handleGptMemory: (
    recent: Message[],
    options?: { previousCommittedTopic?: string }
  ) => Promise<{
    compressionUsage?: ChatApiSearchLike["usage"];
    fallbackUsage?: ChatApiSearchLike["usage"];
    fallbackUsageDetails?: Record<string, unknown> | null;
    fallbackMetrics?: {
      promptChars: number;
      rawReplyChars: number;
    } | null;
  }>;
  applyCompressionUsage: (usage: ChatApiSearchLike["usage"]) => void;
};

export type RunSendToGptFlowArgs = SendToGptFlowRequestArgs &
  SendToGptFlowSearchArgs &
  SendToGptFlowProtocolArgs &
  SendToGptFlowMemoryArgs &
  SendToGptFlowUiArgs;

