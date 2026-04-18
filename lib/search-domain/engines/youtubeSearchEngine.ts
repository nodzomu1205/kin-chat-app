import { requestSerpApi } from "@/lib/search-domain/serpApiClient";
import { buildYoutubeSearchRequest } from "@/lib/search-domain/engineRequestBuilders";
import type { SearchEngineResult, SearchRequest } from "@/lib/search-domain/types";

export async function runYoutubeSearchEngine(
  request: SearchRequest
): Promise<SearchEngineResult> {
  const raw = await requestSerpApi(buildYoutubeSearchRequest(request));

  return {
    engine: "youtube_search",
    raw,
  };
}
