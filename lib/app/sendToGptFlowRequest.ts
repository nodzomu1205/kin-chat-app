import { buildChatApiRequestPayload } from "@/lib/app/sendToGptFlowRequestPayload";
import { buildAssistantResponseArtifacts } from "@/lib/app/sendToGptFlowResponse";
import type {
  ChatApiRequestPayload,
  ChatApiSearchLike,
  PendingRequestLike,
  ProtocolTaskEventLike,
  SearchContextRecorder,
  SearchResponseEventLike,
  WrappedSearchResponse,
} from "@/lib/app/sendToGptFlowTypes";
import type { Memory } from "@/lib/memory";
import type { Message, SourceItem } from "@/types/chat";
import type { SearchEngine, SearchMode } from "@/types/task";

export async function requestGptAssistantArtifacts(args: {
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
  parseWrappedSearchResponse: (text: string) => WrappedSearchResponse;
  askGptEvent?: ProtocolTaskEventLike;
  currentTaskId?: string | null;
  requestToAnswer?: PendingRequestLike | null;
  requestAnswerBody?: string;
  recordSearchContext: SearchContextRecorder;
}): Promise<{
  data: ChatApiSearchLike;
  assistantText: string;
  normalizedSources: SourceItem[];
}> {
  const data = await fetchChatApiSearchData(
    buildRequestPayload({
      requestMemory: args.requestMemory,
      recentMessages: args.recentMessages,
      finalRequestText: args.finalRequestText,
      storedDocumentContext: args.storedDocumentContext,
      storedLibraryContext: args.storedLibraryContext,
      cleanQuery: args.cleanQuery,
      searchRequestEvent: args.searchRequestEvent,
      effectiveParsedSearchQuery: args.effectiveParsedSearchQuery,
      searchSeriesId: args.searchSeriesId,
      continuationToken: args.continuationToken,
      askAiModeLink: args.askAiModeLink,
      effectiveSearchMode: args.effectiveSearchMode,
      effectiveSearchEngines: args.effectiveSearchEngines,
      effectiveSearchLocation: args.effectiveSearchLocation,
      instructionMode: args.instructionMode,
      responseMode: args.responseMode,
    })
  );

  const { assistantText, normalizedSources } = buildAssistantResponseArtifacts({
    data,
    parseWrappedSearchResponse: args.parseWrappedSearchResponse,
    askGptEvent: args.askGptEvent,
    currentTaskId: args.currentTaskId,
    requestToAnswer: args.requestToAnswer,
    requestAnswerBody: args.requestAnswerBody,
    searchRequestEvent: args.searchRequestEvent,
    effectiveSearchMode: args.effectiveSearchMode,
    effectiveSearchEngines: args.effectiveSearchEngines,
    effectiveSearchLocation: args.effectiveSearchLocation,
    searchSeriesId: args.searchSeriesId,
    cleanQuery: args.cleanQuery,
    recordSearchContext: args.recordSearchContext,
  });

  return {
    data,
    assistantText,
    normalizedSources,
  };
}

function buildRequestPayload(args: {
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
}) {
  return buildChatApiRequestPayload({
    requestMemory: args.requestMemory,
    recentMessages: args.recentMessages,
    input: args.finalRequestText,
    storedDocumentContext: args.storedDocumentContext,
    storedLibraryContext: args.storedLibraryContext,
    forcedSearchQuery:
      args.cleanQuery ||
      args.searchRequestEvent?.query ||
      args.effectiveParsedSearchQuery ||
      undefined,
    searchSeriesId: args.searchSeriesId,
    searchContinuationToken: args.continuationToken || undefined,
    searchAskAiModeLink: args.askAiModeLink || undefined,
    searchMode: args.effectiveSearchMode,
    searchEngines: args.effectiveSearchEngines,
    searchLocation: args.effectiveSearchLocation,
    instructionMode: args.instructionMode,
    reasoningMode: args.responseMode,
  });
}

async function fetchChatApiSearchData(payload: ChatApiRequestPayload) {
  const res = await fetch("/api/chatgpt", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return (await res.json()) as ChatApiSearchLike;
}
