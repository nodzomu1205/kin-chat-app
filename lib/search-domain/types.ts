import type {
  SearchContext,
  SearchEngine,
  SearchLocalResultItem,
  SearchMode,
  SearchProductItem,
  SearchSourceItem,
} from "@/types/task";

export type SearchRequest = {
  query: string;
  mode?: SearchMode;
  location?: string;
  engines?: SearchEngine[];
  seriesId?: string;
  continuationToken?: string;
  askAiModeLink?: string;
  maxResults?: number;
};

export type SearchEngineResult = {
  engine: SearchEngine;
  raw: Record<string, unknown>;
};

export type NormalizedSearchPayload = {
  summaryText?: string;
  aiSummary?: string;
  rawText?: string;
  sources?: SearchSourceItem[];
  localResults?: SearchLocalResultItem[];
  products?: SearchProductItem[];
  metadata?: Record<string, unknown>;
};

export type SearchServiceResult = SearchContext;
