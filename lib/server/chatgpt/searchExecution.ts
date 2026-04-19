import { searchWithMode } from "@/lib/search";
import { normalizeStoredSearchMode } from "@/lib/search-domain/presets";
import type { SearchEngine, SearchMode } from "@/types/task";

const SUPPORTED_SEARCH_ENGINES: SearchEngine[] = [
  "google_search",
  "google_ai_mode",
  "google_news",
  "google_maps",
  "google_local",
  "youtube_search",
  "google_flights",
  "google_hotels",
  "google_shopping",
  "amazon_search",
];

type SearchSource = {
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

export type ExecutedSearchResult = {
  searchPromptText: string;
  searchEvidenceText: string;
  returnedSearchContinuationToken: string;
  sources: SearchSource[];
  rawSources: SearchSource[];
};

export function normalizeSearchMode(searchMode: unknown): SearchMode {
  return searchMode === "ai" ||
    searchMode === "integrated" ||
    searchMode === "ai_first" ||
    searchMode === "news" ||
    searchMode === "geo" ||
    searchMode === "youtube" ||
    searchMode === "travel" ||
    searchMode === "product" ||
    searchMode === "entity" ||
    searchMode === "evidence" ||
    searchMode === "normal"
    ? normalizeStoredSearchMode(searchMode)
    : "normal";
}

export function normalizeSearchEngines(searchEngines: unknown): SearchEngine[] {
  return Array.isArray(searchEngines)
    ? searchEngines.filter((engine): engine is SearchEngine =>
        SUPPORTED_SEARCH_ENGINES.includes(String(engine) as SearchEngine)
      )
    : [];
}

export function normalizeSearchExecutionParams(params: {
  searchMode: unknown;
  searchEngines: unknown;
  searchSeriesId?: string;
  searchContinuationToken?: string;
  searchAskAiModeLink?: string;
  searchLocation?: string;
}) {
  const safeSearchMode = normalizeSearchMode(params.searchMode);
  const safeSearchEngines = normalizeSearchEngines(params.searchEngines);

  return {
    safeSearchMode,
    safeSearchEngines,
    searchSeriesId:
      typeof params.searchSeriesId === "string" && params.searchSeriesId.trim()
        ? params.searchSeriesId.trim()
        : undefined,
    searchContinuationToken:
      typeof params.searchContinuationToken === "string" &&
      params.searchContinuationToken.trim()
        ? params.searchContinuationToken.trim()
        : undefined,
    searchAskAiModeLink:
      typeof params.searchAskAiModeLink === "string" &&
      params.searchAskAiModeLink.trim()
        ? params.searchAskAiModeLink.trim()
        : undefined,
    searchLocation:
      typeof params.searchLocation === "string" && params.searchLocation.trim()
        ? params.searchLocation.trim()
        : undefined,
  };
}

export function buildExecutedSearchResult(result: {
  rawText?: string;
  summaryText?: string;
  aiSummary?: string;
  continuationToken?: string;
  sources?: Array<{
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
  }>;
}): ExecutedSearchResult {
  const rawSources = (result.sources || []).map((source) => ({
    title: source.title,
    link: source.link,
    snippet: source.snippet,
    sourceType: source.sourceType,
    publishedAt: source.publishedAt,
    thumbnailUrl: source.thumbnailUrl,
    channelName: source.channelName,
    duration: source.duration,
    viewCount: source.viewCount,
    videoId: source.videoId,
  }));

  return {
    searchPromptText:
      result.summaryText || result.aiSummary || result.rawText || "",
    searchEvidenceText:
      result.rawText || result.summaryText || result.aiSummary || "",
    returnedSearchContinuationToken:
      typeof result.continuationToken === "string"
        ? result.continuationToken
        : "",
    sources: rawSources,
    rawSources,
  };
}

export async function executeSearchRequest(params: {
  query: string;
  searchMode: unknown;
  searchEngines: unknown;
  searchSeriesId?: string;
  searchContinuationToken?: string;
  searchAskAiModeLink?: string;
  searchLocation?: string;
}): Promise<ExecutedSearchResult> {
  const normalized = normalizeSearchExecutionParams(params);

  const result = await searchWithMode({
    query: params.query,
    mode: normalized.safeSearchMode,
    engines:
      normalized.safeSearchEngines.length > 0
        ? normalized.safeSearchEngines
        : undefined,
    seriesId: normalized.searchSeriesId,
    continuationToken: normalized.searchContinuationToken,
    askAiModeLink: normalized.searchAskAiModeLink,
    location: normalized.searchLocation,
    maxResults: 5,
  });

  return buildExecutedSearchResult(result);
}
