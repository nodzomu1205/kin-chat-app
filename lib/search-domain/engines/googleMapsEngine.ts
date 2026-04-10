import { requestSerpApi } from "@/lib/search-domain/serpApiClient";
import { buildLocationAwareQuery } from "@/lib/search-domain/presets";
import type { SearchEngineResult, SearchRequest } from "@/lib/search-domain/types";

export async function runGoogleMapsEngine(
  request: SearchRequest
): Promise<SearchEngineResult> {
  const query = buildLocationAwareQuery(request.query, request.location);
  const raw = await requestSerpApi({
    engine: "google_maps",
    q: query,
    num: request.maxResults ?? 5,
  });

  return {
    engine: "google_maps",
    raw,
  };
}
