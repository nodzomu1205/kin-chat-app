import {
  buildProtocolSourceLines,
  buildSearchResponseBlock,
} from "@/lib/app/sendToGptProtocolBuilders";
import type {
  ProtocolSearchResponseArtifactsArgs,
  SearchSource,
} from "@/lib/app/sendToGptFlowTypes";
import type { SourceItem } from "@/types/chat";

function resolveProtocolSearchSummaryText(
  params: Pick<ProtocolSearchResponseArtifactsArgs, "wrappedSearchResponse" | "data">
) {
  return (
    params.wrappedSearchResponse?.summary ||
    (typeof params.data.reply === "string" && params.data.reply.trim()
      ? params.data.reply.trim()
      : "Search completed, but no summary text was returned.")
  );
}

export function buildSourceItems(sources?: SearchSource[]): SourceItem[] {
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

export function buildProtocolSearchRecordArgs(
  params: ProtocolSearchResponseArtifactsArgs & {
    normalizedSources: SourceItem[];
    requestedMode: string;
  }
): {
  mode?: ProtocolSearchResponseArtifactsArgs["effectiveSearchMode"];
  engines?: ProtocolSearchResponseArtifactsArgs["effectiveSearchEngines"];
  location?: string;
  seriesId?: string;
  continuationToken?: string;
  taskId?: string;
  actionId?: string;
  query: string;
  goal?: string;
  outputMode?: "summary" | "raw_and_summary";
  summaryText?: string;
  rawText: string;
  metadata?: Record<string, unknown>;
  sources: SourceItem[];
} {
  const outputMode =
    params.requestedMode === "raw" || params.requestedMode === "summary_plus_raw"
      ? "raw_and_summary"
      : "summary";
  const summaryText = resolveProtocolSearchSummaryText(params);

  return {
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
    outputMode,
    summaryText,
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
    sources: params.normalizedSources,
  };
}

export function buildProtocolSearchMessageParts(args: {
  params: ProtocolSearchResponseArtifactsArgs;
  normalizedSources: SourceItem[];
  requestedMode: string;
  recordedSearch: { rawResultId: string } | null;
}) {
  const summaryText = resolveProtocolSearchSummaryText(args.params);
  const rawExcerpt =
    args.params.wrappedSearchResponse?.rawExcerpt ||
    (typeof args.params.data.searchEvidence === "string" &&
    args.params.data.searchEvidence.trim()
      ? args.params.data.searchEvidence
          .trim()
          .slice(0, args.requestedMode === "raw" ? 2400 : 1200)
      : "");
  const sourceLines = buildProtocolSourceLines(
    args.normalizedSources,
    args.params.searchRequestEvent.searchEngine ||
      args.params.effectiveSearchEngines[0] ||
      ""
  );

  return {
    summaryText,
    rawExcerpt,
    sourceLines,
    assistantText: buildSearchResponseBlock({
      taskId:
        args.params.searchRequestEvent.taskId || args.params.currentTaskId || "",
      actionId: args.params.searchRequestEvent.actionId || "",
      query:
        args.params.wrappedSearchResponse?.query ||
        args.params.searchRequestEvent.query ||
        (typeof args.params.data.searchQuery === "string"
          ? args.params.data.searchQuery
          : "") ||
        "",
      engine:
        args.params.searchRequestEvent.searchEngine ||
        args.params.effectiveSearchEngines[0] ||
        "",
      location:
        args.params.searchRequestEvent.searchLocation ||
        args.params.effectiveSearchLocation ||
        "",
      requestedMode: args.requestedMode,
      recordedSearch: args.recordedSearch,
      summaryText,
      rawExcerpt,
      wrappedOutputMode: args.params.wrappedSearchResponse?.outputMode,
      sourceLines,
    }),
  };
}
