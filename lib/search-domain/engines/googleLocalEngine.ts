import { requestSerpApi } from "@/lib/search-domain/serpApiClient";
import { buildLocationAwareQuery } from "@/lib/search-domain/presets";
import type { SearchEngineResult, SearchRequest } from "@/lib/search-domain/types";

export async function runGoogleLocalEngine(
  request: SearchRequest
): Promise<SearchEngineResult> {
  const query = buildLocationAwareQuery(request.query, request.location);
  const raw = await requestSerpApi({
    engine: "google_local",
    q: query,
    location: request.location,
    num: request.maxResults ?? 5,
  });

  return {
    engine: "google_local",
    raw,
  };
}
