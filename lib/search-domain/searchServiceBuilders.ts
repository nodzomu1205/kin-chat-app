import { generateId } from "@/lib/uuid";
import { getPresetEnginesForMode } from "@/lib/search-domain/presets";
import type {
  SearchEngineResult,
  SearchRequest,
  SearchServiceResult,
} from "@/lib/search-domain/types";
import type { SearchEngine } from "@/types/task";

export function buildEnginePlan(request: SearchRequest): SearchEngine[] {
  if (request.engines && request.engines.length > 0) {
    return request.engines;
  }
  return getPresetEnginesForMode(request.mode ?? "normal");
}

export function resolveContinuationToken(results: SearchEngineResult[]) {
  const aiModeRaw = results.find((result) => result.engine === "google_ai_mode")
    ?.raw as { subsequent_request_token?: unknown } | undefined;

  return typeof aiModeRaw?.subsequent_request_token === "string"
    ? aiModeRaw.subsequent_request_token
    : undefined;
}

export function buildSearchServiceResponse(args: {
  request: SearchRequest;
  engines: SearchEngine[];
  continuationToken?: string;
  merged: {
    summaryText?: string;
    aiSummary?: string;
    rawText?: string;
    sources?: SearchServiceResult["sources"];
    localResults?: SearchServiceResult["localResults"];
    products?: SearchServiceResult["products"];
    metadata?: SearchServiceResult["metadata"];
  };
}) : SearchServiceResult {
  const createdAt = new Date().toISOString();
  const rawResultId = `RAW-${generateId()}`;

  return {
    id: rawResultId,
    rawResultId,
    mode: args.request.mode ?? "normal",
    engine: args.engines[0],
    engines: args.engines,
    seriesId: args.request.seriesId,
    continuationToken: args.continuationToken,
    query: args.request.query,
    location: args.request.location,
    summaryText: args.merged.summaryText,
    aiSummary: args.merged.aiSummary,
    rawText: args.merged.rawText || "",
    sources: args.merged.sources ?? [],
    localResults: args.merged.localResults,
    products: args.merged.products,
    metadata: {
      ...(args.merged.metadata ?? {}),
      execution: args.engines.length > 1 ? "parallel" : "single",
      maxResults: args.request.maxResults ?? 5,
      seriesId: args.request.seriesId,
      subsequentRequestToken: args.continuationToken,
    },
    createdAt,
  };
}
