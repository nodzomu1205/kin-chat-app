import { requestSerpApi } from "@/lib/search-domain/serpApiClient";
import { fetchPageSnippet } from "@/lib/search-domain/extractors";
import { buildGoogleNewsRequest } from "@/lib/search-domain/engineRequestBuilders";
import {
  enrichSnippetResults,
  extractOrganicResults,
} from "@/lib/search-domain/engineEnrichmentBuilders";
import type { SearchEngineResult, SearchRequest } from "@/lib/search-domain/types";

export async function runGoogleNewsEngine(
  request: SearchRequest
): Promise<SearchEngineResult> {
  const raw = await requestSerpApi(buildGoogleNewsRequest(request));
  const enrichedResults = await enrichSnippetResults({
    items: extractOrganicResults(raw, "news_results"),
    limit: request.maxResults ?? 5,
    query: request.query,
    fetchPageSnippet,
  });

  return {
    engine: "google_news",
    raw: {
      ...raw,
      news_results: enrichedResults,
    },
  };
}
