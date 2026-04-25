import type { ChatPromptMetrics } from "@/lib/shared/chatPromptMetrics";
import type { Message } from "@/types/chat";
import type { SearchEngine, SearchMode } from "@/types/task";

export type SearchSource = {
  title?: string;
  link?: string;
  snippet?: string;
  sourceType?: string;
  publishedAt?: string;
  thumbnailUrl?: string;
  channelName?: string;
  duration?: string;
  viewCount?: string;
  videoId?: string;
};

export type ChatApiSearchLike = {
  reply?: string;
  usage?: Parameters<typeof import("@/lib/shared/tokenStats").normalizeUsage>[0];
  usageDetails?: Record<string, unknown> | null;
  promptMetrics?: ChatPromptMetrics | null;
  searchUsed?: boolean;
  searchQuery?: string;
  searchSeriesId?: string;
  searchContinuationToken?: string;
  searchEvidence?: string;
  searchSummaryText?: string;
  searchSummaryGenerated?: boolean;
  sources?: SearchSource[];
};

export type ChatApiRequestPayload = {
  mode: "chat";
  memory: unknown;
  recentMessages: Message[];
  input: string;
  storedSearchContext: string;
  storedDocumentContext: string;
  storedLibraryContext: string;
  forcedSearchQuery?: string;
  searchSeriesId?: string;
  searchContinuationToken?: string;
  searchAskAiModeLink?: string;
  searchMode: SearchMode;
  searchEngines: SearchEngine[];
  searchLocation: string;
  instructionMode: string;
  reasoningMode: string;
};
