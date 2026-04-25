import { parseTaskInput } from "@/lib/task/taskInputParser";
import type { ProtocolLimitEvent } from "@/lib/app/send-to-gpt/sendToGptFlowBaseTypes";
import type { parseSearchContinuation } from "@/lib/search-domain/continuations";
import type { SearchEngine, SearchMode } from "@/types/task";

export function resolveAiContinuationArtifacts(params: {
  effectiveSearchMode: SearchMode;
  effectiveSearchEngines: SearchEngine[];
  continuationDetails: ReturnType<typeof parseSearchContinuation>;
  searchRequestQuery?: string;
  effectiveParsedSearchQuery?: string;
  getContinuationTokenForSeries: (seriesId: string) => string;
  getAskAiModeLinkForQuery: (query: string) => string;
}) {
  const aiContinuationEnabled =
    params.effectiveSearchEngines.includes("google_ai_mode") ||
    (params.effectiveSearchEngines.length === 0 &&
      (params.effectiveSearchMode === "ai" ||
        params.effectiveSearchMode === "integrated" ||
        params.effectiveSearchMode === "ai_first"));
  const searchSeriesId = aiContinuationEnabled
    ? params.continuationDetails.seriesId
    : undefined;
  const continuationToken = searchSeriesId
    ? params.getContinuationTokenForSeries(searchSeriesId)
    : "";
  const askAiModeLink =
    aiContinuationEnabled && !continuationToken
      ? params.getAskAiModeLinkForQuery(
          params.continuationDetails.cleanQuery ||
            params.searchRequestQuery ||
            params.effectiveParsedSearchQuery ||
            ""
        )
      : "";

  return {
    searchSeriesId,
    continuationToken,
    askAiModeLink,
  };
}

export function resolveProtocolLimitViolation(params: {
  askGptEvent?: {
    taskId?: string;
    actionId?: string;
  };
  searchRequestEvent?: {
    taskId?: string;
    actionId?: string;
  };
  youtubeTranscriptRequestEvent?: {
    taskId?: string;
    actionId?: string;
  };
  userQuestionEvent?: {
    taskId?: string;
    actionId?: string;
  };
  libraryIndexRequestEvent?: {
    taskId?: string;
    actionId?: string;
  };
  libraryItemRequestEvent?: {
    taskId?: string;
    actionId?: string;
  };
  currentTaskId?: string | null;
  getProtocolLimitViolation: (event: ProtocolLimitEvent) => string | null;
}) {
  return (
    (params.askGptEvent &&
      params.getProtocolLimitViolation({
        type: "ask_gpt",
        taskId: params.askGptEvent.taskId,
        actionId: params.askGptEvent.actionId,
      })) ||
    (params.searchRequestEvent &&
      params.getProtocolLimitViolation({
        type: "search_request",
        taskId: params.searchRequestEvent.taskId,
        actionId: params.searchRequestEvent.actionId,
      })) ||
    (params.youtubeTranscriptRequestEvent &&
      params.getProtocolLimitViolation({
        type: "youtube_transcript_request",
        taskId: params.youtubeTranscriptRequestEvent.taskId,
        actionId: params.youtubeTranscriptRequestEvent.actionId,
      })) ||
    (params.userQuestionEvent &&
      params.getProtocolLimitViolation({
        type: "user_question",
        taskId: params.userQuestionEvent.taskId,
        actionId: params.userQuestionEvent.actionId,
      })) ||
    ((params.libraryIndexRequestEvent || params.libraryItemRequestEvent) &&
      params.getProtocolLimitViolation({
        type: "library_reference",
        taskId:
          params.libraryIndexRequestEvent?.taskId ||
          params.libraryItemRequestEvent?.taskId ||
          params.currentTaskId ||
          undefined,
        actionId:
          params.libraryIndexRequestEvent?.actionId ||
          params.libraryItemRequestEvent?.actionId,
      })) ||
    null
  );
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
