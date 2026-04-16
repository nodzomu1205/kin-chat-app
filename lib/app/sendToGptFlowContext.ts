import { parseTaskInput } from "@/lib/taskInputParser";
import { parseSearchContinuation } from "@/lib/search-domain/continuations";
import { extractTaskProtocolEvents } from "@/lib/taskRuntimeProtocol";
import type {
  ParsedInputLike,
  PendingRequestLike,
} from "@/lib/app/sendToGptFlowTypes";
import type { SearchEngine, SearchMode } from "@/types/task";

export function deriveProtocolSearchContext(params: {
  rawText: string;
  findPendingRequest: (requestId: string) => PendingRequestLike | null;
  applyPrefixedTaskFieldsFromText: (text: string) => ParsedInputLike;
  searchMode: SearchMode;
  searchEngines: SearchEngine[];
  searchLocation: string;
  getContinuationTokenForSeries: (seriesId: string) => string;
  getAskAiModeLinkForQuery: (query: string) => string;
}) {
  const protocolEvents = extractTaskProtocolEvents(params.rawText);
  const askGptEvent = protocolEvents.find((event) => event.type === "ask_gpt");
  const searchRequestEvent = protocolEvents.find(
    (event) => event.type === "search_request"
  );
  const youtubeTranscriptRequestEvent = protocolEvents.find(
    (event) => event.type === "youtube_transcript_request"
  );
  const libraryIndexRequestEvent = protocolEvents.find(
    (event) => event.type === "library_index_request"
  );
  const libraryItemRequestEvent = protocolEvents.find(
    (event) => event.type === "library_item_request"
  );
  const userQuestionEvent = protocolEvents.find(
    (event) => event.type === "user_question"
  );

  const reqAnswerMatch = params.rawText.match(
    /^REQ\s+([A-Z]\d+)\s+.+?:\s*([\s\S]*)$/i
  );
  const requestAnswerId = reqAnswerMatch?.[1]?.trim() || "";
  const requestAnswerBody = reqAnswerMatch?.[2]?.trim() || "";
  const requestToAnswer = requestAnswerId
    ? params.findPendingRequest(requestAnswerId)
    : null;

  const parsedInput = params.applyPrefixedTaskFieldsFromText(params.rawText);
  const inlineSearchQuery = extractInlineSearchQuery(params.rawText);
  const effectiveParsedSearchQuery = parsedInput.searchQuery || inlineSearchQuery;
  const continuationDetails = parseSearchContinuation(
    searchRequestEvent?.query || parsedInput.searchQuery || inlineSearchQuery || ""
  );
  const protocolSearchOverrides = resolveProtocolSearchOverrides({
    requestedEngine: searchRequestEvent?.searchEngine,
    requestedLocation: searchRequestEvent?.searchLocation,
    fallbackMode: params.searchMode,
    fallbackEngines: params.searchEngines,
    fallbackLocation: params.searchLocation,
  });
  const effectiveSearchMode = protocolSearchOverrides.searchMode;
  const effectiveSearchEngines = protocolSearchOverrides.searchEngines;
  const effectiveSearchLocation = protocolSearchOverrides.searchLocation;
  const aiContinuationEnabled =
    effectiveSearchEngines.includes("google_ai_mode") ||
    (effectiveSearchEngines.length === 0 &&
      (effectiveSearchMode === "ai" ||
        effectiveSearchMode === "integrated" ||
        effectiveSearchMode === "ai_first"));
  const searchSeriesId = aiContinuationEnabled
    ? continuationDetails.seriesId
    : undefined;
  const continuationToken = searchSeriesId
    ? params.getContinuationTokenForSeries(searchSeriesId)
    : "";
  const askAiModeLink =
    aiContinuationEnabled && !continuationToken
      ? params.getAskAiModeLinkForQuery(
          continuationDetails.cleanQuery ||
            searchRequestEvent?.query ||
            effectiveParsedSearchQuery ||
            ""
        )
      : "";

  return {
    protocolEvents,
    askGptEvent,
    searchRequestEvent,
    youtubeTranscriptRequestEvent,
    libraryIndexRequestEvent,
    libraryItemRequestEvent,
    userQuestionEvent,
    requestToAnswer,
    requestAnswerBody,
    parsedInput,
    effectiveParsedSearchQuery,
    continuationDetails,
    effectiveSearchMode,
    effectiveSearchEngines,
    effectiveSearchLocation,
    searchSeriesId,
    continuationToken,
    askAiModeLink,
  };
}

export function resolveProtocolSearchOverrides(params: {
  requestedEngine?: string;
  requestedLocation?: string;
  fallbackMode: SearchMode;
  fallbackEngines: SearchEngine[];
  fallbackLocation: string;
}) {
  const engine = params.requestedEngine?.trim().toLowerCase();
  const location = params.requestedLocation?.trim() || params.fallbackLocation;

  switch (engine) {
    case "google_search":
      return {
        searchMode: "normal" as SearchMode,
        searchEngines: ["google_search"] as SearchEngine[],
        searchLocation: location,
      };
    case "google_ai_mode":
      return {
        searchMode: "ai" as SearchMode,
        searchEngines: ["google_ai_mode"] as SearchEngine[],
        searchLocation: location,
      };
    case "google_news":
      return {
        searchMode: "news" as SearchMode,
        searchEngines: ["google_news"] as SearchEngine[],
        searchLocation: location,
      };
    case "google_local":
      return {
        searchMode: "geo" as SearchMode,
        searchEngines: ["google_local"] as SearchEngine[],
        searchLocation: location,
      };
    case "youtube_search":
      return {
        searchMode: "youtube" as SearchMode,
        searchEngines: ["youtube_search"] as SearchEngine[],
        searchLocation: location,
      };
    default:
      return {
        searchMode: params.fallbackMode,
        searchEngines: params.fallbackEngines,
        searchLocation: location,
      };
  }
}

export function extractInlineSearchQuery(text: string) {
  if (!text) return "";
  return parseTaskInput(text).searchQuery.trim();
}
