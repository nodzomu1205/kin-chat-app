import type { SearchContext } from "@/types/task";
import { normalizeContinuationSeriesId } from "@/lib/search-domain/continuations";

type AskAiModeCandidate = {
  question?: string;
  title?: string;
  snippet?: string;
  link?: string;
  serpapi_link?: string;
};

function normalizeSearchTextKey(text: string) {
  return text.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
}

export function getVisibleSearchHistory(
  searchHistory: SearchContext[],
  searchHistoryLimit: number
) {
  return searchHistory.slice(0, searchHistoryLimit);
}

export function resolveSelectedSearchResultId(params: {
  selectedTaskSearchResultId: string;
  visibleSearchHistory: SearchContext[];
  lastSearchContext: SearchContext | null;
}) {
  if (!params.selectedTaskSearchResultId) return "";

  if (
    params.visibleSearchHistory.some(
      (item) => item.rawResultId === params.selectedTaskSearchResultId
    )
  ) {
    return params.selectedTaskSearchResultId;
  }

  if (
    params.lastSearchContext?.rawResultId === params.selectedTaskSearchResultId
  ) {
    return params.selectedTaskSearchResultId;
  }

  return "";
}

export function resolveTaskSearchContext(params: {
  visibleSearchHistory: SearchContext[];
  resolvedSelectedTaskSearchResultId: string;
  lastSearchContext: SearchContext | null;
}) {
  return (
    params.visibleSearchHistory.find(
      (item) => item.rawResultId === params.resolvedSelectedTaskSearchResultId
    ) ||
    (params.resolvedSelectedTaskSearchResultId &&
    params.lastSearchContext?.rawResultId ===
      params.resolvedSelectedTaskSearchResultId
      ? params.lastSearchContext
      : null) ||
    params.visibleSearchHistory[0] ||
    params.lastSearchContext ||
    null
  );
}

export function moveSearchHistoryEntry(params: {
  searchHistory: SearchContext[];
  rawResultId: string;
  direction: "up" | "down";
}) {
  const next = [...params.searchHistory];
  const index = next.findIndex((item) => item.rawResultId === params.rawResultId);
  if (index < 0) return next;

  const targetIndex = params.direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= next.length) return next;

  const [moved] = next.splice(index, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

export function getContinuationTokenFromSearchHistory(params: {
  seriesId: string;
  visibleSearchHistory: SearchContext[];
  lastSearchContext: SearchContext | null;
}) {
  const normalizedSeriesId = normalizeContinuationSeriesId(params.seriesId);
  if (!normalizedSeriesId) return "";

  const pool = [
    ...(params.lastSearchContext ? [params.lastSearchContext] : []),
    ...params.visibleSearchHistory,
  ];
  const matched = pool.find((item) => {
    const itemSeriesId =
      typeof item.seriesId === "string"
        ? item.seriesId
        : typeof item.metadata?.seriesId === "string"
          ? String(item.metadata?.seriesId)
          : "";
    return normalizeContinuationSeriesId(itemSeriesId) === normalizedSeriesId;
  });

  if (!matched) return "";
  if (
    typeof matched.continuationToken === "string" &&
    matched.continuationToken.trim()
  ) {
    return matched.continuationToken.trim();
  }
  if (
    typeof matched.metadata?.subsequentRequestToken === "string" &&
    String(matched.metadata?.subsequentRequestToken).trim()
  ) {
    return String(matched.metadata?.subsequentRequestToken).trim();
  }
  return "";
}

export function getAskAiModeLinkFromSearchHistory(params: {
  query: string;
  visibleSearchHistory: SearchContext[];
  lastSearchContext: SearchContext | null;
}) {
  const normalizedQuery = normalizeSearchTextKey(params.query);
  if (!normalizedQuery) return "";

  const pool = [
    ...(params.lastSearchContext ? [params.lastSearchContext] : []),
    ...params.visibleSearchHistory,
  ];
  for (const item of pool) {
    const candidates = Array.isArray(item.metadata?.askAiModeItems)
      ? (item.metadata?.askAiModeItems as AskAiModeCandidate[])
      : [];

    for (const candidate of candidates) {
      const labels = [candidate.question, candidate.title, candidate.snippet]
        .filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0
        )
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
}
