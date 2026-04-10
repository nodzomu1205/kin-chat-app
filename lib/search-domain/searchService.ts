import { generateId } from "@/lib/uuid";
import { runGoogleAiModeEngine } from "@/lib/search-domain/engines/googleAiModeEngine";
import { runGoogleLocalEngine } from "@/lib/search-domain/engines/googleLocalEngine";
import { runGoogleMapsEngine } from "@/lib/search-domain/engines/googleMapsEngine";
import { runGoogleNewsEngine } from "@/lib/search-domain/engines/googleNewsEngine";
import { runGoogleSearchEngine } from "@/lib/search-domain/engines/googleSearchEngine";
import { getPresetEnginesForMode } from "@/lib/search-domain/presets";
import {
  mergeNormalizedPayloads,
  normalizeEngineResult,
} from "@/lib/search-domain/normalizers";
import type {
  SearchEngineResult,
  SearchRequest,
  SearchServiceResult,
} from "@/lib/search-domain/types";
import type { SearchEngine } from "@/types/task";

function buildEnginePlan(request: SearchRequest): SearchEngine[] {
  if (request.engines && request.engines.length > 0) {
    return request.engines;
  }
  return getPresetEnginesForMode(request.mode ?? "normal");
}

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
  const aiModeRaw = results.find((result) => result.engine === "google_ai_mode")?.raw as
    | { subsequent_request_token?: unknown }
    | undefined;
  const continuationToken =
    typeof aiModeRaw?.subsequent_request_token === "string"
      ? aiModeRaw.subsequent_request_token
      : undefined;
  const createdAt = new Date().toISOString();
  const rawResultId = `RAW-${generateId()}`;

  return {
    id: rawResultId,
    rawResultId,
    mode: request.mode ?? "normal",
    engine: engines[0],
    engines,
    seriesId: request.seriesId,
    continuationToken,
    query: request.query,
    location: request.location,
    summaryText: merged.summaryText,
    aiSummary: merged.aiSummary,
    rawText: merged.rawText || "",
    sources: merged.sources ?? [],
    localResults: merged.localResults,
    products: merged.products,
    metadata: {
      ...(merged.metadata ?? {}),
      execution: engines.length > 1 ? "parallel" : "single",
      maxResults: request.maxResults ?? 5,
      seriesId: request.seriesId,
      subsequentRequestToken: continuationToken,
    },
    createdAt,
  };
}
