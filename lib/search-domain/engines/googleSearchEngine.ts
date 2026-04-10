import { requestSerpApi } from "@/lib/search-domain/serpApiClient";
import { fetchPageSnippet } from "@/lib/search-domain/extractors";
import { buildLocationAwareQuery } from "@/lib/search-domain/presets";
import type { SearchEngineResult, SearchRequest } from "@/lib/search-domain/types";

export async function runGoogleSearchEngine(
  request: SearchRequest
): Promise<SearchEngineResult> {
  const raw = await requestSerpApi({
    engine: "google",
    q: buildLocationAwareQuery(request.query, request.location),
    location: request.location,
    num: request.maxResults ?? 5,
  });

  const organicResults = Array.isArray((raw as { organic_results?: unknown }).organic_results)
    ? ((raw as { organic_results?: Array<Record<string, unknown>> }).organic_results ?? [])
    : [];

  const enrichedResults = await Promise.all(
    organicResults.slice(0, request.maxResults ?? 5).map(async (item) => ({
      ...item,
      snippet: await fetchPageSnippet(
        {
          title: typeof item.title === "string" ? item.title : "",
          link: typeof item.link === "string" ? item.link : "",
          snippet: typeof item.snippet === "string" ? item.snippet : "",
        },
        request.query
      ),
    }))
  );

  return {
    engine: "google_search",
    raw: {
      ...raw,
      organic_results: enrichedResults,
    },
  };
}
