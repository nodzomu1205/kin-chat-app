import type { UsageSummary } from "@/lib/server/chatgpt/openaiResponse";
import type { ChatPromptMetrics } from "@/lib/chatPromptMetrics";

type ChatRouteSource = {
  title: string;
  link: string;
  snippet?: string;
  sourceType?: string;
  publishedAt?: string;
  thumbnailUrl?: string;
  channelName?: string;
  duration?: string;
  viewCount?: string | number;
  videoId?: string;
};

type ChatRouteSearchPayload = {
  sources: ChatRouteSource[];
  searchUsed: boolean;
  searchQuery: string;
  searchSeriesId: string;
  searchContinuationToken: string;
  searchEvidence: string;
};

export function buildMapLinkShortcutResponse(params: {
  title: string;
  link: string;
  search: ChatRouteSearchPayload;
}) {
  return {
    reply: `${params.title}\n${params.link}`,
    sources: params.search.sources,
    usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 } satisfies UsageSummary,
    searchUsed: params.search.searchUsed,
    searchQuery: params.search.searchQuery,
    searchSeriesId: params.search.searchSeriesId,
    searchContinuationToken: params.search.searchContinuationToken,
    searchEvidence: params.search.searchEvidence,
  };
}

export function buildChatRouteResponse(params: {
  reply: string;
  usage: UsageSummary;
  usageDetails: Record<string, unknown> | null;
  search: ChatRouteSearchPayload;
  promptMetrics: ChatPromptMetrics;
}) {
  return {
    reply: params.reply,
    sources: params.search.sources,
    usage: params.usage,
    usageDetails: params.usageDetails,
    promptMetrics: params.promptMetrics,
    searchUsed: params.search.searchUsed,
    searchQuery: params.search.searchQuery,
    searchSeriesId: params.search.searchSeriesId,
    searchContinuationToken: params.search.searchContinuationToken,
    searchEvidence: params.search.searchEvidence,
  };
}
