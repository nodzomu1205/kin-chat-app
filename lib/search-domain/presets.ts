import type { SearchEngine, SearchMode } from "@/types/task";

export type PrimarySearchMode =
  | "normal"
  | "ai"
  | "integrated"
  | "news"
  | "geo"
  | "youtube";

export const SEARCH_MODE_PRESETS: Record<
  PrimarySearchMode,
  { label: string; engines: SearchEngine[] }
> = {
  normal: {
    label: "通常",
    engines: ["google_search"],
  },
  ai: {
    label: "AI",
    engines: ["google_ai_mode"],
  },
  integrated: {
    label: "統合",
    engines: ["google_search", "google_ai_mode"],
  },
  news: {
    label: "News",
    engines: ["google_news"],
  },
  geo: {
    label: "Maps / Local",
    engines: ["google_maps", "google_local"],
  },
  youtube: {
    label: "YouTube",
    engines: ["youtube_search"],
  },
};

function sameEngines(left: SearchEngine[], right: SearchEngine[]) {
  if (left.length !== right.length) return false;
  const leftSorted = [...left].sort();
  const rightSorted = [...right].sort();
  return leftSorted.every((engine, index) => engine === rightSorted[index]);
}

export function isPrimarySearchMode(value: string): value is PrimarySearchMode {
  return (
    value === "normal" ||
    value === "ai" ||
    value === "integrated" ||
    value === "news" ||
    value === "geo" ||
    value === "youtube"
  );
}

export function normalizeStoredSearchMode(value?: string): SearchMode {
  if (value === "ai_first") return "integrated";
  if (
    value === "normal" ||
    value === "ai" ||
    value === "integrated" ||
    value === "news" ||
    value === "geo" ||
    value === "youtube" ||
    value === "travel" ||
    value === "product" ||
    value === "entity" ||
    value === "evidence"
  ) {
    return value;
  }
  return "normal";
}

export function getPresetEnginesForMode(mode: SearchMode): SearchEngine[] {
  switch (mode) {
    case "ai":
      return [...SEARCH_MODE_PRESETS.ai.engines];
    case "integrated":
    case "ai_first":
      return [...SEARCH_MODE_PRESETS.integrated.engines];
    case "news":
      return [...SEARCH_MODE_PRESETS.news.engines];
    case "geo":
      return ["google_maps", "google_local"];
    case "youtube":
      return [...SEARCH_MODE_PRESETS.youtube.engines];
    case "entity":
    case "evidence":
      return ["google_search", "google_news"];
    case "normal":
    default:
      return [...SEARCH_MODE_PRESETS.normal.engines];
  }
}

export function inferPrimarySearchModeFromEngines(
  engines: SearchEngine[]
): PrimarySearchMode | null {
  if (engines.length === 0) return null;
  const match = (Object.keys(SEARCH_MODE_PRESETS) as PrimarySearchMode[]).find(
    (mode) => sameEngines(engines, SEARCH_MODE_PRESETS[mode].engines)
  );
  return match ?? null;
}

export function buildLocationAwareQuery(query: string, location?: string) {
  const trimmedQuery = query.trim();
  const trimmedLocation = location?.trim() || "";
  if (!trimmedQuery || !trimmedLocation) return trimmedQuery;

  const queryLower = trimmedQuery.toLowerCase();
  const locationLower = trimmedLocation.toLowerCase();
  if (queryLower.includes(locationLower)) {
    return trimmedQuery;
  }

  return `${trimmedQuery} ${trimmedLocation}`.trim();
}

function normalizeCountryToken(location?: string) {
  const trimmed = location?.trim();
  if (!trimmed) return "";

  const parts = trimmed
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return (parts[parts.length - 1] || trimmed).toLowerCase();
}

export function resolveGoogleNewsLocale(location?: string): {
  gl?: string;
  hl?: string;
} {
  const token = normalizeCountryToken(location);
  if (!token) return {};

  const table: Record<string, { gl: string; hl: string }> = {
    japan: { gl: "jp", hl: "ja" },
    jp: { gl: "jp", hl: "ja" },
    "united states": { gl: "us", hl: "en" },
    usa: { gl: "us", hl: "en" },
    us: { gl: "us", hl: "en" },
    "united kingdom": { gl: "uk", hl: "en" },
    uk: { gl: "uk", hl: "en" },
    britain: { gl: "uk", hl: "en" },
    england: { gl: "uk", hl: "en" },
    france: { gl: "fr", hl: "fr" },
    fr: { gl: "fr", hl: "fr" },
    germany: { gl: "de", hl: "de" },
    de: { gl: "de", hl: "de" },
    italy: { gl: "it", hl: "it" },
    it: { gl: "it", hl: "it" },
    spain: { gl: "es", hl: "es" },
    es: { gl: "es", hl: "es" },
    canada: { gl: "ca", hl: "en" },
    ca: { gl: "ca", hl: "en" },
    australia: { gl: "au", hl: "en" },
    au: { gl: "au", hl: "en" },
    india: { gl: "in", hl: "en" },
    "south africa": { gl: "za", hl: "en" },
    za: { gl: "za", hl: "en" },
    singapore: { gl: "sg", hl: "en" },
    sg: { gl: "sg", hl: "en" },
    korea: { gl: "kr", hl: "ko" },
    "south korea": { gl: "kr", hl: "ko" },
    kr: { gl: "kr", hl: "ko" },
    china: { gl: "cn", hl: "zh-cn" },
    cn: { gl: "cn", hl: "zh-cn" },
    taiwan: { gl: "tw", hl: "zh-tw" },
    tw: { gl: "tw", hl: "zh-tw" },
  };

  return table[token] ?? {};
}
