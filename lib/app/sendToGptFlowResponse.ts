import {
  buildProtocolSourceLines,
  buildSearchResponseBlock,
} from "@/lib/app/sendToGptProtocolBuilders";
import { buildUserResponseBlock } from "@/lib/taskRuntimeProtocol";
import type {
  ChatApiSearchLike,
  PendingRequestLike,
  ProtocolTaskEventLike,
  SearchContextRecorder,
  SearchResponseEventLike,
  SearchSource,
  WrappedSearchResponse,
} from "@/lib/app/sendToGptFlowTypes";
import type { SourceItem } from "@/types/chat";
import type { SearchEngine, SearchMode } from "@/types/task";

export function toSourceItems(sources?: SearchSource[]): SourceItem[] {
  return Array.isArray(sources)
    ? sources.map((source) => ({
        title: source.title || "",
        link: source.link || "",
        snippet: source.snippet,
        sourceType: source.sourceType,
        publishedAt: source.publishedAt,
        thumbnailUrl: source.thumbnailUrl,
        channelName: source.channelName,
        duration: source.duration,
        viewCount: source.viewCount,
        videoId: source.videoId,
      }))
    : [];
}

export function wrapProtocolAssistantText(params: {
  assistantText: string;
  askGptEvent?: ProtocolTaskEventLike;
  currentTaskId?: string | null;
  requestToAnswer?: PendingRequestLike | null;
  requestAnswerBody?: string;
}) {
  let nextAssistantText = params.assistantText;

  if (params.askGptEvent && !nextAssistantText.includes("<<SYS_GPT_RESPONSE>>")) {
    nextAssistantText = [
      "<<SYS_GPT_RESPONSE>>",
      `TASK_ID: ${params.askGptEvent.taskId || params.currentTaskId || ""}`,
      `ACTION_ID: ${params.askGptEvent.actionId || ""}`,
      `BODY: ${nextAssistantText}`,
      "<<END_SYS_GPT_RESPONSE>>",
    ].join("\n");
  }

  if (
    params.requestToAnswer &&
    params.requestAnswerBody &&
    !nextAssistantText.includes("<<SYS_USER_RESPONSE>>")
  ) {
    nextAssistantText = buildUserResponseBlock({
      taskId: params.requestToAnswer.taskId,
      actionId: params.requestToAnswer.actionId,
      body: nextAssistantText,
    });
  }

  return nextAssistantText;
}

export function buildProtocolSearchResponseArtifacts(params: {
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
}) {
  const requestedMode = params.searchRequestEvent.outputMode || "summary";
  const normalizedSources = toSourceItems(params.data.sources);
  const recordedSearch = params.data.searchUsed
    ? params.recordSearchContext({
        mode: params.effectiveSearchMode,
        engines: params.effectiveSearchEngines,
        location: params.effectiveSearchLocation || undefined,
        seriesId:
          typeof params.data.searchSeriesId === "string"
            ? params.data.searchSeriesId
            : params.searchSeriesId,
        continuationToken:
          typeof params.data.searchContinuationToken === "string"
            ? params.data.searchContinuationToken
            : undefined,
        taskId: params.searchRequestEvent.taskId || params.currentTaskId || undefined,
        actionId: params.searchRequestEvent.actionId || undefined,
        query:
          params.cleanQuery ||
          params.searchRequestEvent.query ||
          (typeof params.data.searchQuery === "string" ? params.data.searchQuery : "") ||
          "",
        goal: params.searchRequestEvent.body || params.searchRequestEvent.summary || "",
        outputMode:
          requestedMode === "raw" || requestedMode === "summary_plus_raw"
            ? "raw_and_summary"
            : "summary",
        summaryText:
          typeof params.data.reply === "string" && params.data.reply.trim()
            ? params.data.reply.trim()
            : "",
        rawText:
          typeof params.data.searchEvidence === "string" ? params.data.searchEvidence : "",
        metadata:
          typeof params.data.searchSeriesId === "string" ||
          typeof params.data.searchContinuationToken === "string"
            ? {
                seriesId:
                  typeof params.data.searchSeriesId === "string"
                    ? params.data.searchSeriesId
                    : params.searchSeriesId,
                subsequentRequestToken:
                  typeof params.data.searchContinuationToken === "string"
                    ? params.data.searchContinuationToken
                    : undefined,
              }
            : undefined,
        sources: normalizedSources,
      })
    : null;

  const summaryText =
    params.wrappedSearchResponse?.summary ||
    (typeof params.data.reply === "string" && params.data.reply.trim()
      ? params.data.reply.trim()
      : "Search completed, but no summary text was returned.");
  const rawExcerpt =
    params.wrappedSearchResponse?.rawExcerpt ||
    (typeof params.data.searchEvidence === "string" && params.data.searchEvidence.trim()
      ? params.data.searchEvidence.trim().slice(0, requestedMode === "raw" ? 2400 : 1200)
      : "");
  const sourceLines = buildProtocolSourceLines(
    normalizedSources,
    params.searchRequestEvent.searchEngine || params.effectiveSearchEngines[0] || ""
  );
  const assistantText = buildSearchResponseBlock({
    taskId: params.searchRequestEvent.taskId || params.currentTaskId || "",
    actionId: params.searchRequestEvent.actionId || "",
    query:
      params.wrappedSearchResponse?.query ||
      params.searchRequestEvent.query ||
      (typeof params.data.searchQuery === "string" ? params.data.searchQuery : "") ||
      "",
    engine:
      params.searchRequestEvent.searchEngine || params.effectiveSearchEngines[0] || "",
    location:
      params.searchRequestEvent.searchLocation || params.effectiveSearchLocation || "",
    requestedMode,
    recordedSearch,
    summaryText,
    rawExcerpt,
    wrappedOutputMode: params.wrappedSearchResponse?.outputMode,
    sourceLines,
  });

  return {
    assistantText,
    normalizedSources,
    recordedSearch,
    requestedMode,
  };
}

export function buildAssistantResponseArtifacts(params: {
  data: ChatApiSearchLike;
  parseWrappedSearchResponse: (text: string) => WrappedSearchResponse;
  askGptEvent?: ProtocolTaskEventLike;
  currentTaskId?: string | null;
  requestToAnswer?: PendingRequestLike | null;
  requestAnswerBody?: string;
  searchRequestEvent?: SearchResponseEventLike;
  effectiveSearchMode: SearchMode;
  effectiveSearchEngines: SearchEngine[];
  effectiveSearchLocation: string;
  searchSeriesId?: string;
  cleanQuery?: string;
  recordSearchContext: SearchContextRecorder;
}) {
  let assistantText =
    typeof params.data.reply === "string" && params.data.reply.trim()
      ? params.data.reply.trim()
      : "GPT did not return a usable response.";
  let normalizedSources: SourceItem[] = [];

  assistantText = wrapProtocolAssistantText({
    assistantText,
    askGptEvent: params.askGptEvent,
    currentTaskId: params.currentTaskId,
    requestToAnswer: params.requestToAnswer,
    requestAnswerBody: params.requestAnswerBody,
  });

  if (params.searchRequestEvent) {
    const wrappedSearchResponse =
      typeof params.data.reply === "string" &&
      params.data.reply.includes("<<SYS_SEARCH_RESPONSE>>")
        ? params.parseWrappedSearchResponse(params.data.reply)
        : null;
    const searchArtifacts = buildProtocolSearchResponseArtifacts({
      data: params.data,
      searchRequestEvent: params.searchRequestEvent,
      currentTaskId: params.currentTaskId,
      wrappedSearchResponse,
      effectiveSearchMode: params.effectiveSearchMode,
      effectiveSearchEngines: params.effectiveSearchEngines,
      effectiveSearchLocation: params.effectiveSearchLocation,
      searchSeriesId: params.searchSeriesId,
      cleanQuery: params.cleanQuery,
      recordSearchContext: params.recordSearchContext,
    });
    normalizedSources = searchArtifacts.normalizedSources;
    assistantText = searchArtifacts.assistantText;
  } else if (params.data.searchUsed) {
    normalizedSources = toSourceItems(params.data.sources);
  }

  return {
    assistantText,
    normalizedSources,
  };
}
