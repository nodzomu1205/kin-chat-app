import { useEffect, useMemo, useState } from "react";
import {
  getAskAiModeLinkFromSearchHistory,
  getContinuationTokenFromSearchHistory,
  getVisibleSearchHistory,
  moveSearchHistoryEntry,
  resolveSelectedSearchResultId,
  resolveTaskSearchContext,
} from "@/lib/app/search-history/searchHistoryState";
import { requestGeneratedLibrarySummary } from "@/lib/app/reference-library/librarySummaryClient";
import { cleanImportSummarySource } from "@/lib/app/ingest/importSummaryText";
import { buildCanonicalSummarySource } from "@/lib/app/ingest/ingestDocumentModel";
import { normalizeLibrarySummaryIngestUsage } from "@/lib/app/ingest/ingestUsage";
import { normalizeUsage } from "@/lib/shared/tokenStats";
import { normalizeStoredSearchMode } from "@/lib/search-domain/presets";
import type { SearchContext, SearchEngine, SearchMode } from "@/types/task";

const LAST_SEARCH_CONTEXT_KEY = "last_search_context";
const SEARCH_HISTORY_KEY = "search_history";
const SEARCH_HISTORY_LIMIT_KEY = "search_history_limit";
const SEARCH_MODE_KEY = "search_mode";
const SEARCH_ENGINES_KEY = "search_engines";
const SEARCH_LOCATION_KEY = "search_location";
const SOURCE_DISPLAY_COUNT_KEY = "source_display_count";

export const DEFAULT_SEARCH_HISTORY_LIMIT = 20;
export const DEFAULT_SEARCH_MODE: SearchMode = "normal";
export const DEFAULT_SOURCE_DISPLAY_COUNT = 3;

export function buildSearchContextLibrarySummaryRequest(
  context: Pick<SearchContext, "query" | "rawText" | "summaryText" | "metadata">
) {
  if (context.summaryText?.trim() && context.metadata?.librarySummaryGenerated) {
    return null;
  }

  const text = buildCanonicalSummarySource(context.rawText || "");
  if (!text) return null;

  return {
    title: context.query.trim() || "search-result",
    text,
  };
}

export function applySearchContextLibrarySummary(
  context: SearchContext,
  summaryText: string
): SearchContext {
  return {
    ...context,
    summaryText,
    metadata: {
      ...(context.metadata || {}),
      librarySummaryGenerated: true,
    },
  };
}

const ALLOWED_SEARCH_ENGINES: SearchEngine[] = [
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

function loadSearchHistoryState() {
  const initialState = {
    lastSearchContext: null as SearchContext | null,
    searchHistory: [] as SearchContext[],
    selectedTaskSearchResultId: "",
    searchHistoryLimit: DEFAULT_SEARCH_HISTORY_LIMIT,
    searchMode: DEFAULT_SEARCH_MODE,
    searchEngines: [] as SearchEngine[],
    searchLocation: "",
    sourceDisplayCount: DEFAULT_SOURCE_DISPLAY_COUNT,
  };

  if (typeof window === "undefined") {
    return initialState;
  }

  const savedSearchContext = window.localStorage.getItem(LAST_SEARCH_CONTEXT_KEY);
  const savedSearchHistory = window.localStorage.getItem(SEARCH_HISTORY_KEY);
  const savedSearchHistoryLimit = window.localStorage.getItem(SEARCH_HISTORY_LIMIT_KEY);
  const savedSearchMode = window.localStorage.getItem(SEARCH_MODE_KEY);
  const savedSearchEngines = window.localStorage.getItem(SEARCH_ENGINES_KEY);
  const savedSearchLocation = window.localStorage.getItem(SEARCH_LOCATION_KEY);
  const savedSourceDisplayCount = window.localStorage.getItem(
    SOURCE_DISPLAY_COUNT_KEY
  );

  if (savedSearchHistoryLimit) {
    const parsed = Number(savedSearchHistoryLimit);
    if (Number.isFinite(parsed) && parsed > 0) {
      initialState.searchHistoryLimit = parsed;
    }
  }

  if (savedSearchMode) {
    initialState.searchMode = normalizeStoredSearchMode(savedSearchMode);
  }

  if (savedSearchEngines) {
    try {
      const parsed = JSON.parse(savedSearchEngines) as string[];
      if (Array.isArray(parsed)) {
        initialState.searchEngines = parsed.filter(
          (engine): engine is SearchEngine =>
            ALLOWED_SEARCH_ENGINES.includes(engine as SearchEngine)
        );
      }
    } catch {}
  }

  if (savedSearchLocation) {
    initialState.searchLocation = savedSearchLocation;
  }

  if (savedSourceDisplayCount) {
    const parsed = Number(savedSourceDisplayCount);
    if (Number.isFinite(parsed) && parsed >= 1) {
      initialState.sourceDisplayCount = parsed;
    }
  }

  if (savedSearchContext) {
    try {
      const parsed = JSON.parse(savedSearchContext) as SearchContext;
      if (parsed?.rawResultId && parsed?.query) {
        initialState.lastSearchContext = parsed;
      }
    } catch {}
  }

  if (savedSearchHistory) {
    try {
      const parsed = JSON.parse(savedSearchHistory) as SearchContext[];
      if (Array.isArray(parsed)) {
        initialState.searchHistory = parsed
          .filter((item) => item?.rawResultId && item?.query)
          .slice(0, initialState.searchHistoryLimit);
      }
    } catch {}
  }

  return initialState;
}

export function useSearchHistory(params?: {
  applyIngestUsage?: (usage: Parameters<typeof normalizeUsage>[0]) => void;
  autoGenerateLibrarySummaries?: boolean;
}) {
  const [initialState] = useState(loadSearchHistoryState);
  const [lastSearchContext, setLastSearchContext] = useState<SearchContext | null>(
    initialState.lastSearchContext
  );
  const [searchHistory, setSearchHistory] = useState<SearchContext[]>(
    initialState.searchHistory
  );
  const [selectedTaskSearchResultId, setSelectedTaskSearchResultId] = useState(
    initialState.selectedTaskSearchResultId
  );
  const [searchHistoryLimit, setSearchHistoryLimit] = useState(
    initialState.searchHistoryLimit
  );
  const [searchMode, setSearchMode] = useState<SearchMode>(initialState.searchMode);
  const [searchEngines, setSearchEngines] = useState<SearchEngine[]>(
    initialState.searchEngines
  );
  const [searchLocation, setSearchLocation] = useState(
    initialState.searchLocation
  );
  const [sourceDisplayCount, setSourceDisplayCount] = useState(
    initialState.sourceDisplayCount
  );
  const visibleSearchHistory = useMemo(
    () => getVisibleSearchHistory(searchHistory, searchHistoryLimit),
    [searchHistory, searchHistoryLimit]
  );
  const resolvedSelectedTaskSearchResultId = useMemo(
    () =>
      resolveSelectedSearchResultId({
        selectedTaskSearchResultId,
        visibleSearchHistory,
        lastSearchContext,
      }),
    [lastSearchContext, selectedTaskSearchResultId, visibleSearchHistory]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SEARCH_HISTORY_LIMIT_KEY, String(searchHistoryLimit));
  }, [searchHistoryLimit]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SEARCH_MODE_KEY, searchMode);
  }, [searchMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SEARCH_ENGINES_KEY, JSON.stringify(searchEngines));
  }, [searchEngines]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SEARCH_LOCATION_KEY, searchLocation);
  }, [searchLocation]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      SOURCE_DISPLAY_COUNT_KEY,
      String(sourceDisplayCount)
    );
  }, [sourceDisplayCount]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (lastSearchContext) {
      window.localStorage.setItem(
        LAST_SEARCH_CONTEXT_KEY,
        JSON.stringify(lastSearchContext)
      );
      return;
    }
    window.localStorage.removeItem(LAST_SEARCH_CONTEXT_KEY);
  }, [lastSearchContext]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      SEARCH_HISTORY_KEY,
      JSON.stringify(visibleSearchHistory)
    );
  }, [visibleSearchHistory]);

  const getTaskSearchContext = () =>
    resolveTaskSearchContext({
      visibleSearchHistory,
      resolvedSelectedTaskSearchResultId,
      lastSearchContext,
    });

  const moveSearchHistoryItem = (rawResultId: string, direction: "up" | "down") => {
    setSearchHistory((prev) => {
      const next = moveSearchHistoryEntry({
        searchHistory: prev,
        rawResultId,
        direction,
      });
      return next;
    });
  };

  const buildRawResultId = (params: {
    taskId?: string;
    actionId?: string;
    createdAt?: string;
  }) => {
    const taskId = params.taskId?.trim() || "no-task";
    const actionId = params.actionId?.trim() || "A000";
    const stamp = (params.createdAt || new Date().toISOString()).replace(/\D/g, "").slice(0, 14);
    return `RAW-${taskId}-${actionId}-${stamp || Date.now()}`;
  };

  const recordSearchContext = (
    context: Omit<SearchContext, "rawResultId" | "createdAt"> & {
      rawResultId?: string;
      createdAt?: string;
    }
  ) => {
    const createdAt = context.createdAt || new Date().toISOString();
    const nextContext: SearchContext = {
      ...context,
      rawResultId:
        context.rawResultId ||
        buildRawResultId({
          taskId: context.taskId,
          actionId: context.actionId,
          createdAt,
        }),
      createdAt,
    };

    setLastSearchContext(nextContext);
    setSearchHistory((prev) => {
      const deduped = prev.filter((item) => item.rawResultId !== nextContext.rawResultId);
      return [nextContext, ...deduped].slice(0, searchHistoryLimit);
    });
    if (params?.autoGenerateLibrarySummaries !== false) {
      void enrichSearchContextSummary(nextContext);
    }

    return nextContext;
  };

  const getContinuationTokenForSeries = (seriesId: string) => {
    return getContinuationTokenFromSearchHistory({
      seriesId,
      visibleSearchHistory,
      lastSearchContext,
    });
  };

  const getAskAiModeLinkForQuery = (query: string) => {
    return getAskAiModeLinkFromSearchHistory({
      query,
      visibleSearchHistory,
      lastSearchContext,
    });
  };

  const clearSearchHistory = () => {
    setLastSearchContext(null);
    setSearchHistory([]);
    setSelectedTaskSearchResultId("");
  };

  const deleteSearchHistoryItem = (rawResultId: string) => {
    setSearchHistory((prev) => prev.filter((item) => item.rawResultId !== rawResultId));
    setLastSearchContext((prev) => (prev?.rawResultId === rawResultId ? null : prev));
    setSelectedTaskSearchResultId((prev) => (prev === rawResultId ? "" : prev));
  };

  const replaceSearchContext = (nextContext: SearchContext) => {
    setLastSearchContext((prev) =>
      prev?.rawResultId === nextContext.rawResultId ? nextContext : prev
    );
    setSearchHistory((prev) =>
      prev.map((item) =>
        item.rawResultId === nextContext.rawResultId ? nextContext : item
      )
    );
  };

  const enrichSearchContextSummary = async (context: SearchContext) => {
    const summaryRequest = buildSearchContextLibrarySummaryRequest(context);
    if (!summaryRequest) return;

    try {
      const summaryResult = await requestGeneratedLibrarySummary(summaryRequest);
      const generatedSummary = cleanImportSummarySource(
        summaryResult.summary || ""
      ).trim();
      if (!generatedSummary) return;

      replaceSearchContext(
        applySearchContextLibrarySummary(context, generatedSummary)
      );
      params?.applyIngestUsage?.(
        normalizeLibrarySummaryIngestUsage(summaryResult.usage)
      );
    } catch (error) {
      console.warn("Search summary generation failed", error);
    }
  };

  const searchHistoryStorageMB = useMemo(() => {
    try {
      const bytes = new TextEncoder().encode(JSON.stringify(visibleSearchHistory)).length;
      return bytes / (1024 * 1024);
    } catch {
      return 0;
    }
  }, [visibleSearchHistory]);

  return {
    lastSearchContext,
    setLastSearchContext,
    searchHistory: visibleSearchHistory,
    selectedTaskSearchResultId: resolvedSelectedTaskSearchResultId,
    setSelectedTaskSearchResultId,
    searchHistoryLimit,
    setSearchHistoryLimit,
    searchMode,
    setSearchMode,
    searchEngines,
    setSearchEngines,
    searchLocation,
    setSearchLocation,
    sourceDisplayCount,
    setSourceDisplayCount,
    getTaskSearchContext,
    moveSearchHistoryItem,
    recordSearchContext,
    getContinuationTokenForSeries,
    getAskAiModeLinkForQuery,
    clearSearchHistory,
    deleteSearchHistoryItem,
    searchHistoryStorageMB,
  };
}
