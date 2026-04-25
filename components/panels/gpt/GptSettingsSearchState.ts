import {
  inferPrimarySearchModeFromEngines,
  isPrimarySearchMode,
  normalizeStoredSearchMode,
  SEARCH_MODE_PRESETS,
  type PrimarySearchMode,
} from "@/lib/search-domain/presets";
import type { SearchEngine, SearchMode } from "@/types/task";

export type { PrimarySearchMode };

export function resolveActiveSearchMode(args: {
  searchMode: SearchMode;
  searchEngines: SearchEngine[];
}): PrimarySearchMode | undefined {
  if (args.searchEngines.length > 0) {
    return inferPrimarySearchModeFromEngines(args.searchEngines) ?? undefined;
  }

  const normalizedSearchMode = normalizeStoredSearchMode(args.searchMode);
  return isPrimarySearchMode(normalizedSearchMode)
    ? normalizedSearchMode
    : "normal";
}

export function buildSearchPresetSelection(mode: PrimarySearchMode): {
  searchMode: SearchMode;
  searchEngines: SearchEngine[];
} {
  return {
    searchMode: mode as SearchMode,
    searchEngines: [...SEARCH_MODE_PRESETS[mode].engines],
  };
}

export function buildToggledSearchEngineSelection(args: {
  searchEngines: SearchEngine[];
  engine: SearchEngine;
}): {
  searchEngines: SearchEngine[];
  inferredSearchMode?: SearchMode;
} {
  const searchEngines = args.searchEngines.includes(args.engine)
    ? args.searchEngines.filter((item) => item !== args.engine)
    : [...args.searchEngines, args.engine];
  const inferred = inferPrimarySearchModeFromEngines(searchEngines);

  return {
    searchEngines,
    inferredSearchMode: inferred ? (inferred as SearchMode) : undefined,
  };
}

export function normalizeSourceDisplayCountInput(args: {
  input: string;
  currentValue: number;
}) {
  const normalized = args.input.replace(/[^\d]/g, "").trim();
  return Math.max(1, Math.min(20, Number(normalized || args.currentValue || 1)));
}
