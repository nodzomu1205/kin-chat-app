import { requestSerpApi } from "@/lib/search-domain/serpApiClient";
import { buildLocationAwareQuery } from "@/lib/search-domain/presets";
import type { SearchEngineResult, SearchRequest } from "@/lib/search-domain/types";

export async function runGoogleAiModeEngine(
  request: SearchRequest
): Promise<SearchEngineResult> {
  const raw = await requestSerpApi({
    engine: "google_ai_mode",
    serpapiLink: request.askAiModeLink,
    q: request.continuationToken
      ? request.query.trim()
      : buildLocationAwareQuery(request.query, request.location),
    location: request.location,
    num: request.maxResults ?? 5,
    subsequent_request_token: request.continuationToken,
  });

  return {
    engine: "google_ai_mode",
    raw,
  };
}
