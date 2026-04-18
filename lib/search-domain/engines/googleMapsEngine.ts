import { requestSerpApi } from "@/lib/search-domain/serpApiClient";
import { buildGoogleMapsRequest } from "@/lib/search-domain/engineRequestBuilders";
import type { SearchEngineResult, SearchRequest } from "@/lib/search-domain/types";

export async function runGoogleMapsEngine(
  request: SearchRequest
): Promise<SearchEngineResult> {
  const raw = await requestSerpApi(buildGoogleMapsRequest(request));

  return {
    engine: "google_maps",
    raw,
  };
}
