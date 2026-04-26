import type { Dispatch, SetStateAction } from "react";
import type { ReasoningMode } from "@/lib/app/task-runtime/reasoningMode";
import type { Memory } from "@/lib/memory-domain/memory";
import type { MemoryResultLike } from "@/lib/app/send-to-gpt/sendToGptFlowArgTypes";
import type { ChatApiSearchLike } from "@/lib/app/send-to-gpt/sendToGptApiTypes";
import type { PreparedRequestFinalizeContext } from "@/lib/app/send-to-gpt/sendToGptPreparedRequestTypes";
import type { ConversationUsageOptions } from "@/lib/shared/tokenStats";
import type { Message, SourceItem } from "@/types/chat";
import type { SearchEngine, SearchMode } from "@/types/task";
import type { TaskProtocolEvent } from "@/types/taskProtocol";
import type {
  PendingRequestLike,
  ProtocolTaskEventLike,
  SearchContextRecorder,
  SearchResponseEventLike,
  WrappedSearchResponse,
} from "@/lib/app/send-to-gpt/sendToGptFlowBaseTypes";

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
  applySearchUsage: (usage: Parameters<typeof import("@/lib/shared/tokenStats").normalizeUsage>[0]) => void;
  applyChatUsage: (
    usage: Parameters<typeof import("@/lib/shared/tokenStats").normalizeUsage>[0],
    options?: ConversationUsageOptions
  ) => void;
  recordSearchContext: SearchContextRecorder;
};

export type ProtocolInteractionContext = {
  protocolEvents: ReturnType<typeof import("@/lib/task/taskRuntimeProtocol").extractTaskProtocolEvents>;
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
  reasoningMode: ReasoningMode;
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
  ) => Promise<MemoryResultLike>;
  applyCompressionUsage: (usage: ChatApiSearchLike["usage"]) => void;
};
