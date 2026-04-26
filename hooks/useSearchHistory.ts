import { useEffect, useMemo, useState } from "react";
import {
  getAskAiModeLinkFromSearchHistory,
  getContinuationTokenFromSearchHistory,
  getVisibleSearchHistory,
  moveSearchHistoryEntry,
  resolveSelectedSearchResultId,
  resolveTaskSearchContext,
} from "@/lib/app/search-history/searchHistoryState";
import {
  loadSearchHistoryState,
  saveLastSearchContext,
  saveSearchEngines,
  saveSearchHistory,
  saveSearchHistoryLimit,
  saveSearchLocation,
  saveSearchMode,
  saveSourceDisplayCount,
} from "@/lib/app/search-history/searchHistoryStorage";
import { requestGeneratedLibrarySummary } from "@/lib/app/reference-library/librarySummaryClient";
import { cleanImportSummarySource } from "@/lib/app/ingest/importSummaryText";
import {
  buildCanonicalSummarySource,
  cleanSearchLibraryDisplayText,
} from "@/lib/app/ingest/ingestDocumentModel";
import { normalizeLibrarySummaryIngestUsage } from "@/lib/app/ingest/ingestUsage";
import { normalizeUsage } from "@/lib/shared/tokenStats";
import type { SearchContext, SearchEngine, SearchMode } from "@/types/task";

export {
  DEFAULT_SEARCH_HISTORY_LIMIT,
  DEFAULT_SEARCH_MODE,
  DEFAULT_SOURCE_DISPLAY_COUNT,
} from "@/lib/app/search-history/searchHistoryStorage";

export function buildSearchContextLibrarySummaryRequest(
  context: Pick<SearchContext, "query" | "rawText" | "summaryText" | "metadata">
) {
  if (context.summaryText?.trim() && context.metadata?.librarySummaryGenerated) {
    return null;
  }

  const text = buildCanonicalSummarySource(
    cleanSearchLibraryDisplayText(context.rawText || "")
  );
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
    saveSearchHistoryLimit(searchHistoryLimit);
  }, [searchHistoryLimit]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    saveSearchMode(searchMode);
  }, [searchMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    saveSearchEngines(searchEngines);
  }, [searchEngines]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    saveSearchLocation(searchLocation);
  }, [searchLocation]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    saveSourceDisplayCount(sourceDisplayCount);
  }, [sourceDisplayCount]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    saveLastSearchContext(lastSearchContext);
  }, [lastSearchContext]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    saveSearchHistory(visibleSearchHistory);
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
