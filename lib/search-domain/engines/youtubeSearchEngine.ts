import { requestSerpApi } from "@/lib/search-domain/serpApiClient";
import type { SearchEngineResult, SearchRequest } from "@/lib/search-domain/types";

export async function runYoutubeSearchEngine(
  request: SearchRequest
): Promise<SearchEngineResult> {
  const raw = await requestSerpApi({
    engine: "youtube",
    num: request.maxResults ?? 5,
    extraParams: {
      search_query: request.query.trim(),
    },
  });

  return {
    engine: "youtube_search",
    raw,
  };
}
