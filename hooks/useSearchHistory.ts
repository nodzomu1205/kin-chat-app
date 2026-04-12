import { useEffect, useMemo, useState } from "react";
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

function normalizeSearchTextKey(text: string) {
  return text.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
}

type AskAiModeCandidate = {
  question?: string;
  title?: string;
  snippet?: string;
  link?: string;
  serpapi_link?: string;
};

export function useSearchHistory() {
  const [lastSearchContext, setLastSearchContext] = useState<SearchContext | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchContext[]>([]);
  const [selectedTaskSearchResultId, setSelectedTaskSearchResultId] = useState("");
  const [searchHistoryLimit, setSearchHistoryLimit] = useState(DEFAULT_SEARCH_HISTORY_LIMIT);
  const [searchMode, setSearchMode] = useState<SearchMode>(DEFAULT_SEARCH_MODE);
  const [searchEngines, setSearchEngines] = useState<SearchEngine[]>([]);
  const [searchLocation, setSearchLocation] = useState("");
  const [sourceDisplayCount, setSourceDisplayCount] = useState(
    DEFAULT_SOURCE_DISPLAY_COUNT
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

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
      if (Number.isFinite(parsed) && parsed > 0) setSearchHistoryLimit(parsed);
    }
    if (savedSearchMode) {
      setSearchMode(normalizeStoredSearchMode(savedSearchMode));
    }
    if (savedSearchEngines) {
      try {
        const parsed = JSON.parse(savedSearchEngines) as string[];
        if (Array.isArray(parsed)) {
          setSearchEngines(
            parsed.filter((engine): engine is SearchEngine =>
              ALLOWED_SEARCH_ENGINES.includes(engine as SearchEngine)
            )
          );
        }
      } catch {}
    }
    if (savedSearchLocation) {
      setSearchLocation(savedSearchLocation);
    }
    if (savedSourceDisplayCount) {
      const parsed = Number(savedSourceDisplayCount);
      if (Number.isFinite(parsed) && parsed >= 1) {
        setSourceDisplayCount(parsed);
      }
    }
    if (savedSearchContext) {
      try {
        const parsed = JSON.parse(savedSearchContext) as SearchContext;
        if (parsed?.rawResultId && parsed?.query) setLastSearchContext(parsed);
      } catch {}
    }
    if (savedSearchHistory) {
      try {
        const parsed = JSON.parse(savedSearchHistory) as SearchContext[];
        if (Array.isArray(parsed)) {
          setSearchHistory(
            parsed
              .filter((item) => item?.rawResultId && item?.query)
              .slice(0, DEFAULT_SEARCH_HISTORY_LIMIT)
          );
        }
      } catch {}
    }
  }, []);

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
    window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(searchHistory));
  }, [searchHistory]);

  useEffect(() => {
    setSearchHistory((prev) => prev.slice(0, searchHistoryLimit));
  }, [searchHistoryLimit]);

  useEffect(() => {
    if (!lastSearchContext) return;
    setSearchHistory((prev) => {
      if (prev.some((item) => item.rawResultId === lastSearchContext.rawResultId)) {
        return prev;
      }
      return [lastSearchContext, ...prev].slice(0, searchHistoryLimit);
    });
  }, [lastSearchContext, searchHistoryLimit]);

  useEffect(() => {
    if (!selectedTaskSearchResultId) return;
    if (searchHistory.some((item) => item.rawResultId === selectedTaskSearchResultId)) return;
    if (lastSearchContext?.rawResultId === selectedTaskSearchResultId) return;
    setSelectedTaskSearchResultId("");
  }, [lastSearchContext?.rawResultId, searchHistory, selectedTaskSearchResultId]);

  const getTaskSearchContext = () =>
    searchHistory.find((item) => item.rawResultId === selectedTaskSearchResultId) ||
    (selectedTaskSearchResultId &&
    lastSearchContext?.rawResultId === selectedTaskSearchResultId
      ? lastSearchContext
      : null) ||
    searchHistory[0] ||
    lastSearchContext ||
    null;

  const moveSearchHistoryItem = (rawResultId: string, direction: "up" | "down") => {
    setSearchHistory((prev) => {
      const index = prev.findIndex((item) => item.rawResultId === rawResultId);
      if (index < 0) return prev;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
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

    return nextContext;
  };

  const getContinuationTokenForSeries = (seriesId: string) => {
    const normalizedSeriesId = seriesId.trim();
    if (!normalizedSeriesId) return "";

    const pool = [...(lastSearchContext ? [lastSearchContext] : []), ...searchHistory];
    const matched = pool.find((item) => {
      const itemSeriesId =
        typeof item.seriesId === "string"
          ? item.seriesId
          : typeof item.metadata?.seriesId === "string"
            ? String(item.metadata?.seriesId)
            : "";
      return itemSeriesId === normalizedSeriesId;
    });

    if (!matched) return "";
    if (typeof matched.continuationToken === "string" && matched.continuationToken.trim()) {
      return matched.continuationToken.trim();
    }
    if (
      typeof matched.metadata?.subsequentRequestToken === "string" &&
      String(matched.metadata?.subsequentRequestToken).trim()
    ) {
      return String(matched.metadata?.subsequentRequestToken).trim();
    }
    return "";
  };

  const getAskAiModeLinkForQuery = (query: string) => {
    const normalizedQuery = normalizeSearchTextKey(query);
    if (!normalizedQuery) return "";

    const pool = [...(lastSearchContext ? [lastSearchContext] : []), ...searchHistory];
    for (const item of pool) {
      const candidates = Array.isArray(item.metadata?.askAiModeItems)
        ? (item.metadata?.askAiModeItems as AskAiModeCandidate[])
        : [];

      for (const candidate of candidates) {
        const labels = [candidate.question, candidate.title, candidate.snippet]
          .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
          .map((value) => normalizeSearchTextKey(value));

        if (!labels.includes(normalizedQuery)) continue;

        if (
          typeof candidate.serpapi_link === "string" &&
          candidate.serpapi_link.trim()
        ) {
          return candidate.serpapi_link.trim();
        }

        if (typeof candidate.link === "string" && candidate.link.trim()) {
          return candidate.link.trim();
        }
      }
    }

    return "";
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

  const searchHistoryStorageMB = useMemo(() => {
    try {
      const bytes = new TextEncoder().encode(JSON.stringify(searchHistory)).length;
      return bytes / (1024 * 1024);
    } catch {
      return 0;
    }
  }, [searchHistory]);

  return {
    lastSearchContext,
    setLastSearchContext,
    searchHistory,
    setSearchHistory,
    selectedTaskSearchResultId,
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
