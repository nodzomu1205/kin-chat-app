import { createEmptyMemory, type Memory } from "@/lib/memory-domain/memory";
import type {
  GptStateSnapshotLike,
} from "@/lib/app/send-to-gpt/sendToGptFlowBaseTypes";
import type {
  SendToGptImplicitSearchArtifactsArgs,
  SendToGptMemoryPreparation,
} from "@/lib/app/send-to-gpt/sendToGptFlowArtifactTypes";
import type { Message } from "@/types/chat";

export function buildMemoryUpdateContext(params: {
  gptState: GptStateSnapshotLike;
  userMessage: Message;
  chatRecentLimit: number;
}): SendToGptMemoryPreparation["memoryContext"] {
  const baseRecent = params.gptState.recentMessages || [];
  const recentWithUser = [...baseRecent, params.userMessage].slice(
    -params.chatRecentLimit
  );

  return {
    baseRecent,
    recentWithUser,
    previousCommittedTopic:
      typeof params.gptState.memory?.context?.currentTopic === "string"
        ? params.gptState.memory.context.currentTopic
        : undefined,
  };
}

export function buildRequestMemory(params: {
  gptState: GptStateSnapshotLike;
}): Memory {
  return (params.gptState.memory as Memory | undefined) || createEmptyMemory();
}

export function buildImplicitSearchRecordArgs(
  params: SendToGptImplicitSearchArtifactsArgs
) {
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
    query:
      (typeof params.data.searchQuery === "string" &&
        params.data.searchQuery.trim()) ||
      params.cleanQuery ||
      params.effectiveParsedSearchQuery ||
      params.finalRequestText,
    summaryText:
      typeof params.data.searchSummaryText === "string" &&
      params.data.searchSummaryText.trim()
        ? params.data.searchSummaryText
        : typeof params.data.reply === "string" && params.data.reply.trim()
          ? params.data.reply
        : "",
    rawText:
      typeof params.data.searchEvidence === "string"
        ? params.data.searchEvidence
        : "",
    metadata:
      typeof params.data.searchSeriesId === "string" ||
      typeof params.data.searchContinuationToken === "string" ||
      params.data.searchSummaryGenerated
        ? {
            seriesId:
              typeof params.data.searchSeriesId === "string"
                ? params.data.searchSeriesId
                : params.searchSeriesId,
            subsequentRequestToken:
              typeof params.data.searchContinuationToken === "string"
                ? params.data.searchContinuationToken
                : undefined,
            ...(params.data.searchSummaryGenerated
              ? { librarySummaryGenerated: true }
              : {}),
          }
        : undefined,
    sources:
      params.data.sources?.map((source) => ({
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
      })) || [],
  };
}
