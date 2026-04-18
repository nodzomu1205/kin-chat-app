import { requestSerpApi } from "@/lib/search-domain/serpApiClient";
import { buildGoogleLocalRequest } from "@/lib/search-domain/engineRequestBuilders";
import type { SearchEngineResult, SearchRequest } from "@/lib/search-domain/types";

export async function runGoogleLocalEngine(
  request: SearchRequest
): Promise<SearchEngineResult> {
  const raw = await requestSerpApi(buildGoogleLocalRequest(request));

  return {
    engine: "google_local",
    raw,
  };
}
