import { parseSearchContinuation } from "@/lib/search-domain/continuations";
import { parseTaskInput } from "@/lib/task/taskInputParser";

type SearchContinuationInfo = {
  cleanQuery: string;
  seriesId?: string;
};

export type ResolvedSearchRequest = {
  useSearch: boolean;
  searchQuery: string;
  continuation: SearchContinuationInfo;
  effectiveSeriesId: string;
};

function parseSearchCommandStable(text: string) {
  if (!text) return null;
  return parseTaskInput(text).searchQuery.trim() || null;
}

export function resolveSearchRequest(params: {
  input: string;
  forcedSearchQuery?: string;
  searchSeriesId?: string;
}): ResolvedSearchRequest {
  const searchQuery =
    typeof params.forcedSearchQuery === "string" &&
    params.forcedSearchQuery.trim()
      ? params.forcedSearchQuery.trim()
      : parseSearchCommandStable(params.input) || "";

  const continuation = searchQuery
    ? parseSearchContinuation(searchQuery)
    : { cleanQuery: "", seriesId: undefined };

  const effectiveSeriesId =
    typeof params.searchSeriesId === "string" && params.searchSeriesId.trim()
      ? params.searchSeriesId.trim()
      : continuation.seriesId || "";

  return {
    useSearch: !!searchQuery,
    searchQuery,
    continuation,
    effectiveSeriesId,
  };
}
