import { createEmptyMemory, type Memory } from "@/lib/memory";
import { resolveMemoryUpdateContext } from "@/lib/app/sendToGptFlowState";
import type {
  ChatApiSearchLike,
  PendingRequestLike,
  SearchContextRecorder,
  SearchResponseEventLike,
  WrappedSearchResponse,
} from "@/lib/app/sendToGptFlowTypes";
import type { Message, SourceItem } from "@/types/chat";
import type { SearchEngine, SearchMode } from "@/types/task";

export function buildSendToGptMemoryBundle(args: {
  gptStateRef: { current: { recentMessages?: Message[]; memory?: Memory } };
  userMsg: Message;
  chatRecentLimit: number;
}) {
  const memoryContext = resolveMemoryUpdateContext({
    gptState: args.gptStateRef.current,
    userMessage: args.userMsg,
    chatRecentLimit: args.chatRecentLimit,
  });
  const requestMemory =
    (args.gptStateRef.current.memory as Memory | undefined) || createEmptyMemory();

  return {
    memoryContext,
    requestMemory,
  };
}

export function buildSendToGptRequestArtifactsArgs(args: {
  requestMemory: Memory;
  recentMessages: Message[];
  preparedRequest: {
    finalRequestText: string;
    effectiveDocumentReferenceContext: string;
    libraryReferenceContext: string;
    continuationDetails: { cleanQuery?: string };
    searchRequestEvent?: SearchResponseEventLike;
    effectiveParsedSearchQuery: string;
    searchSeriesId?: string;
    continuationToken?: string;
    askAiModeLink?: string;
    effectiveSearchMode: SearchMode;
    effectiveSearchEngines: SearchEngine[];
    effectiveSearchLocation: string;
    askGptEvent?: {
      taskId?: string;
      actionId?: string;
      body?: string;
    };
    requestToAnswer?: PendingRequestLike | null;
    requestAnswerBody?: string;
  };
  instructionMode: string;
  responseMode: string;
  parseWrappedSearchResponse: (text: string) => WrappedSearchResponse;
  currentTaskId: string | null;
  recordSearchContext: SearchContextRecorder;
}) {
  return {
    requestMemory: args.requestMemory,
    recentMessages: args.recentMessages,
    finalRequestText: args.preparedRequest.finalRequestText,
    storedDocumentContext: args.preparedRequest.effectiveDocumentReferenceContext,
    storedLibraryContext: args.preparedRequest.libraryReferenceContext,
    cleanQuery: args.preparedRequest.continuationDetails.cleanQuery,
    searchRequestEvent: args.preparedRequest.searchRequestEvent,
    effectiveParsedSearchQuery: args.preparedRequest.effectiveParsedSearchQuery,
    searchSeriesId: args.preparedRequest.searchSeriesId,
    continuationToken: args.preparedRequest.continuationToken,
    askAiModeLink: args.preparedRequest.askAiModeLink,
    effectiveSearchMode: args.preparedRequest.effectiveSearchMode,
    effectiveSearchEngines: args.preparedRequest.effectiveSearchEngines,
    effectiveSearchLocation: args.preparedRequest.effectiveSearchLocation,
    instructionMode: args.instructionMode,
    responseMode: args.responseMode,
    parseWrappedSearchResponse: args.parseWrappedSearchResponse,
    askGptEvent: args.preparedRequest.askGptEvent,
    currentTaskId: args.currentTaskId,
    requestToAnswer: args.preparedRequest.requestToAnswer,
    requestAnswerBody: args.preparedRequest.requestAnswerBody,
    recordSearchContext: args.recordSearchContext,
  };
}

export function buildSendToGptFinalizeArgs(args: {
  data: ChatApiSearchLike;
  assistantText: string;
  normalizedSources: SourceItem[];
  memoryContext: {
    recentWithUser: Message[];
    previousCommittedTopic?: string;
  };
  chatRecentLimit: number;
  preparedRequest: {
    searchRequestEvent?: SearchResponseEventLike;
    effectiveSearchMode: SearchMode;
    effectiveSearchEngines: SearchEngine[];
    effectiveSearchLocation: string;
    searchSeriesId?: string;
    continuationDetails: { cleanQuery?: string };
    effectiveParsedSearchQuery: string;
    finalRequestText: string;
    requestToAnswer?: PendingRequestLike | null;
    requestAnswerBody?: string;
  };
  ingestProtocolMessage: (
    text: string,
    direction: "kin_to_gpt" | "gpt_to_kin" | "user_to_kin" | "system"
  ) => void;
  taskProtocolAnswerPendingRequest: (requestId: string, answerText: string) => void;
  setGptMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  applySearchUsage: (usage: ChatApiSearchLike["usage"]) => void;
  applyChatUsage: (usage: ChatApiSearchLike["usage"]) => void;
  recordSearchContext: SearchContextRecorder;
  handleGptMemory: (
    recent: Message[],
    options?: { previousCommittedTopic?: string }
  ) => Promise<{ summaryUsage?: ChatApiSearchLike["usage"] }>;
  applySummaryUsage: (usage: ChatApiSearchLike["usage"]) => void;
}) {
  return {
    data: args.data,
    assistantText: args.assistantText,
    normalizedSources: args.normalizedSources,
    memoryContext: args.memoryContext,
    chatRecentLimit: args.chatRecentLimit,
    searchRequestEvent: args.preparedRequest.searchRequestEvent,
    effectiveSearchMode: args.preparedRequest.effectiveSearchMode,
    effectiveSearchEngines: args.preparedRequest.effectiveSearchEngines,
    effectiveSearchLocation: args.preparedRequest.effectiveSearchLocation,
    searchSeriesId: args.preparedRequest.searchSeriesId,
    cleanQuery: args.preparedRequest.continuationDetails.cleanQuery,
    effectiveParsedSearchQuery: args.preparedRequest.effectiveParsedSearchQuery,
    finalRequestText: args.preparedRequest.finalRequestText,
    ingestProtocolMessage: args.ingestProtocolMessage,
    requestToAnswer: args.preparedRequest.requestToAnswer,
    requestAnswerBody: args.preparedRequest.requestAnswerBody,
    taskProtocolAnswerPendingRequest: args.taskProtocolAnswerPendingRequest,
    setGptMessages: args.setGptMessages,
    applySearchUsage: args.applySearchUsage,
    applyChatUsage: args.applyChatUsage,
    recordSearchContext: args.recordSearchContext,
    handleGptMemory: args.handleGptMemory,
    applySummaryUsage: args.applySummaryUsage,
  };
}
