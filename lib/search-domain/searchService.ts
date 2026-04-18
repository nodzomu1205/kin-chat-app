import { runGoogleAiModeEngine } from "@/lib/search-domain/engines/googleAiModeEngine";
import { runGoogleLocalEngine } from "@/lib/search-domain/engines/googleLocalEngine";
import { runGoogleMapsEngine } from "@/lib/search-domain/engines/googleMapsEngine";
import { runGoogleNewsEngine } from "@/lib/search-domain/engines/googleNewsEngine";
import { runGoogleSearchEngine } from "@/lib/search-domain/engines/googleSearchEngine";
import { runYoutubeSearchEngine } from "@/lib/search-domain/engines/youtubeSearchEngine";
import {
  mergeNormalizedPayloads,
  normalizeEngineResult,
} from "@/lib/search-domain/normalizers";
import {
  buildEnginePlan,
  buildSearchServiceResponse,
  resolveContinuationToken,
} from "@/lib/search-domain/searchServiceBuilders";
import type {
  SearchEngineResult,
  SearchRequest,
  SearchServiceResult,
} from "@/lib/search-domain/types";
import type { SearchEngine } from "@/types/task";

async function runEngine(
  engine: SearchEngine,
  request: SearchRequest
): Promise<SearchEngineResult> {
  switch (engine) {
    case "google_maps":
      return runGoogleMapsEngine(request);
    case "google_local":
      return runGoogleLocalEngine(request);
    case "google_ai_mode":
      return runGoogleAiModeEngine(request);
    case "google_news":
      return runGoogleNewsEngine(request);
    case "google_search":
      return runGoogleSearchEngine(request);
    case "youtube_search":
      return runYoutubeSearchEngine(request);
    default:
      return runGoogleSearchEngine(request);
  }
}

export async function runSearchService(
  request: SearchRequest
): Promise<SearchServiceResult> {
  const engines = buildEnginePlan(request);
  const results = await Promise.all(engines.map((engine) => runEngine(engine, request)));
  const normalized = results.map((result) => normalizeEngineResult(result, request));
  const merged = mergeNormalizedPayloads(normalized);
  const continuationToken = resolveContinuationToken(results);

  return buildSearchServiceResponse({
    request,
    engines,
    continuationToken,
    merged,
  });
}
