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

type SearchHistoryStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type SearchHistoryStoredState = {
  lastSearchContext: SearchContext | null;
  searchHistory: SearchContext[];
  selectedTaskSearchResultId: string;
  searchHistoryLimit: number;
  searchMode: SearchMode;
  searchEngines: SearchEngine[];
  searchLocation: string;
  sourceDisplayCount: number;
};

export function buildDefaultSearchHistoryState(): SearchHistoryStoredState {
  return {
    lastSearchContext: null,
    searchHistory: [],
    selectedTaskSearchResultId: "",
    searchHistoryLimit: DEFAULT_SEARCH_HISTORY_LIMIT,
    searchMode: DEFAULT_SEARCH_MODE,
    searchEngines: [],
    searchLocation: "",
    sourceDisplayCount: DEFAULT_SOURCE_DISPLAY_COUNT,
  };
}

function resolveStorage(storage?: SearchHistoryStorage | null) {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function readJson<T>(storage: SearchHistoryStorage, key: string): T | null {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadSearchHistoryState(
  storageInput?: SearchHistoryStorage | null
): SearchHistoryStoredState {
  const initialState = buildDefaultSearchHistoryState();
  const storage = resolveStorage(storageInput);
  if (!storage) return initialState;

  const savedSearchHistoryLimit = storage.getItem(SEARCH_HISTORY_LIMIT_KEY);
  if (savedSearchHistoryLimit) {
    const parsed = Number(savedSearchHistoryLimit);
    if (Number.isFinite(parsed) && parsed > 0) {
      initialState.searchHistoryLimit = parsed;
    }
  }

  const savedSearchMode = storage.getItem(SEARCH_MODE_KEY);
  if (savedSearchMode) {
    initialState.searchMode = normalizeStoredSearchMode(savedSearchMode);
  }

  const savedSearchEngines = readJson<string[]>(storage, SEARCH_ENGINES_KEY);
  if (Array.isArray(savedSearchEngines)) {
    initialState.searchEngines = savedSearchEngines.filter(
      (engine): engine is SearchEngine =>
        ALLOWED_SEARCH_ENGINES.includes(engine as SearchEngine)
    );
  }

  const savedSearchLocation = storage.getItem(SEARCH_LOCATION_KEY);
  if (savedSearchLocation) {
    initialState.searchLocation = savedSearchLocation;
  }

  const savedSourceDisplayCount = storage.getItem(SOURCE_DISPLAY_COUNT_KEY);
  if (savedSourceDisplayCount) {
    const parsed = Number(savedSourceDisplayCount);
    if (Number.isFinite(parsed) && parsed >= 1) {
      initialState.sourceDisplayCount = parsed;
    }
  }

  const savedSearchContext = readJson<SearchContext>(
    storage,
    LAST_SEARCH_CONTEXT_KEY
  );
  if (savedSearchContext?.rawResultId && savedSearchContext?.query) {
    initialState.lastSearchContext = savedSearchContext;
  }

  const savedSearchHistory = readJson<SearchContext[]>(storage, SEARCH_HISTORY_KEY);
  if (Array.isArray(savedSearchHistory)) {
    initialState.searchHistory = savedSearchHistory
      .filter((item) => item?.rawResultId && item?.query)
      .slice(0, initialState.searchHistoryLimit);
  }

  return initialState;
}

export function saveSearchHistoryLimit(value: number) {
  window.localStorage.setItem(SEARCH_HISTORY_LIMIT_KEY, String(value));
}

export function saveSearchMode(value: SearchMode) {
  window.localStorage.setItem(SEARCH_MODE_KEY, value);
}

export function saveSearchEngines(value: SearchEngine[]) {
  window.localStorage.setItem(SEARCH_ENGINES_KEY, JSON.stringify(value));
}

export function saveSearchLocation(value: string) {
  window.localStorage.setItem(SEARCH_LOCATION_KEY, value);
}

export function saveSourceDisplayCount(value: number) {
  window.localStorage.setItem(SOURCE_DISPLAY_COUNT_KEY, String(value));
}

export function saveLastSearchContext(value: SearchContext | null) {
  if (value) {
    window.localStorage.setItem(LAST_SEARCH_CONTEXT_KEY, JSON.stringify(value));
    return;
  }
  window.localStorage.removeItem(LAST_SEARCH_CONTEXT_KEY);
}

export function saveSearchHistory(value: SearchContext[]) {
  window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(value));
}
