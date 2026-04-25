import { parseSearchContinuation } from "@/lib/search-domain/continuations";
import { extractTaskProtocolEvents } from "@/lib/taskRuntimeProtocol";
import type {
  DerivedSearchContext,
  ParsedInputLike,
  PendingRequestLike,
  ProtocolInteractionContext,
} from "@/lib/app/send-to-gpt/sendToGptFlowTypes";
import type { SearchEngine, SearchMode } from "@/types/task";

export function buildProtocolInteractionContext(params: {
  rawText: string;
  findPendingRequest: (requestId: string) => PendingRequestLike | null;
  resolveRequestAnswerContext: (args: {
    rawText: string;
    findPendingRequest: (requestId: string) => PendingRequestLike | null;
  }) => {
    requestToAnswer: PendingRequestLike | null;
    requestAnswerBody: string;
  };
}): ProtocolInteractionContext {
  const protocolEvents = extractTaskProtocolEvents(params.rawText);
  const { requestToAnswer, requestAnswerBody } =
    params.resolveRequestAnswerContext({
      rawText: params.rawText,
      findPendingRequest: params.findPendingRequest,
    });

  return {
    protocolEvents,
    askGptEvent: protocolEvents.find((event) => event.type === "ask_gpt"),
    searchRequestEvent: protocolEvents.find(
      (event) => event.type === "search_request"
    ),
    youtubeTranscriptRequestEvent: protocolEvents.find(
      (event) => event.type === "youtube_transcript_request"
    ),
    libraryIndexRequestEvent: protocolEvents.find(
      (event) => event.type === "library_index_request"
    ),
    libraryItemRequestEvent: protocolEvents.find(
      (event) => event.type === "library_item_request"
    ),
    userQuestionEvent: protocolEvents.find(
      (event) => event.type === "user_question"
    ),
    requestToAnswer,
    requestAnswerBody,
  };
}

export function buildDerivedSearchContext(params: {
  parsedInput: ParsedInputLike;
  searchRequestEvent?: {
    query?: string;
    searchEngine?: string;
    searchLocation?: string;
  };
  searchMode: SearchMode;
  searchEngines: SearchEngine[];
  searchLocation: string;
  inlineSearchQuery: string;
  resolveProtocolSearchOverrides: (args: {
    requestedEngine?: string;
    requestedLocation?: string;
    fallbackMode: SearchMode;
    fallbackEngines: SearchEngine[];
    fallbackLocation: string;
  }) => {
    searchMode: SearchMode;
    searchEngines: SearchEngine[];
    searchLocation: string;
  };
  resolveAiContinuationArtifacts: (args: {
    effectiveSearchMode: SearchMode;
    effectiveSearchEngines: SearchEngine[];
    continuationDetails: ReturnType<typeof parseSearchContinuation>;
    searchRequestQuery?: string;
    effectiveParsedSearchQuery?: string;
    getContinuationTokenForSeries: (seriesId: string) => string;
    getAskAiModeLinkForQuery: (query: string) => string;
  }) => {
    searchSeriesId?: string;
    continuationToken?: string;
    askAiModeLink?: string;
  };
  getContinuationTokenForSeries: (seriesId: string) => string;
  getAskAiModeLinkForQuery: (query: string) => string;
}): DerivedSearchContext {
  const effectiveParsedSearchQuery =
    params.parsedInput.searchQuery || params.inlineSearchQuery;
  const continuationDetails = parseSearchContinuation(
    params.searchRequestEvent?.query ||
      params.parsedInput.searchQuery ||
      params.inlineSearchQuery ||
      ""
  );
  const overrides = params.resolveProtocolSearchOverrides({
    requestedEngine: params.searchRequestEvent?.searchEngine,
    requestedLocation: params.searchRequestEvent?.searchLocation,
    fallbackMode: params.searchMode,
    fallbackEngines: params.searchEngines,
    fallbackLocation: params.searchLocation,
  });
  const continuation = params.resolveAiContinuationArtifacts({
    effectiveSearchMode: overrides.searchMode,
    effectiveSearchEngines: overrides.searchEngines,
    continuationDetails,
    searchRequestQuery: params.searchRequestEvent?.query,
    effectiveParsedSearchQuery,
    getContinuationTokenForSeries: params.getContinuationTokenForSeries,
    getAskAiModeLinkForQuery: params.getAskAiModeLinkForQuery,
  });

  return {
    inlineSearchQuery: params.inlineSearchQuery,
    effectiveParsedSearchQuery,
    continuationDetails,
    effectiveSearchMode: overrides.searchMode,
    effectiveSearchEngines: overrides.searchEngines,
    effectiveSearchLocation: overrides.searchLocation,
    searchSeriesId: continuation.searchSeriesId,
    continuationToken: continuation.continuationToken,
    askAiModeLink: continuation.askAiModeLink,
  };
}
