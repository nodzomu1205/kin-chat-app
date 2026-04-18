import { requestSerpApi } from "@/lib/search-domain/serpApiClient";
import { fetchPageSnippet } from "@/lib/search-domain/extractors";
import { buildGoogleSearchRequest } from "@/lib/search-domain/engineRequestBuilders";
import {
  enrichSnippetResults,
  extractOrganicResults,
} from "@/lib/search-domain/engineEnrichmentBuilders";
import type { SearchEngineResult, SearchRequest } from "@/lib/search-domain/types";

export async function runGoogleSearchEngine(
  request: SearchRequest
): Promise<SearchEngineResult> {
  const raw = await requestSerpApi(buildGoogleSearchRequest(request));
  const enrichedResults = await enrichSnippetResults({
    items: extractOrganicResults(raw, "organic_results"),
    limit: request.maxResults ?? 5,
    query: request.query,
    fetchPageSnippet,
  });

  return {
    engine: "google_search",
    raw: {
      ...raw,
      organic_results: enrichedResults,
    },
  };
}
