import { requestSerpApi } from "@/lib/search-domain/serpApiClient";
import { buildGoogleAiModeRequest } from "@/lib/search-domain/engineRequestBuilders";
import type { SearchEngineResult, SearchRequest } from "@/lib/search-domain/types";

export async function runGoogleAiModeEngine(
  request: SearchRequest
): Promise<SearchEngineResult> {
  const raw = await requestSerpApi(buildGoogleAiModeRequest(request));

  return {
    engine: "google_ai_mode",
    raw,
  };
}
