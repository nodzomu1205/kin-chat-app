import { describe, expect, it, vi } from "vitest";
import {
  buildEnginePlan,
  buildSearchServiceResponse,
  resolveContinuationToken,
} from "@/lib/search-domain/searchServiceBuilders";
import type { SearchEngineResult, SearchRequest } from "@/lib/search-domain/types";

describe("searchServiceBuilders", () => {
  it("builds an engine plan from explicit engines or presets", () => {
    expect(
      buildEnginePlan({
        query: "tokyo weather",
        engines: ["google_search"],
      } as SearchRequest)
    ).toEqual(["google_search"]);

    expect(
      buildEnginePlan({
        query: "tokyo weather",
        mode: "geo",
      } as SearchRequest)
    ).toContain("google_maps");
  });

  it("resolves the continuation token from ai mode results", () => {
    expect(
      resolveContinuationToken([
        {
          engine: "google_ai_mode",
          raw: { subsequent_request_token: "TOKEN-1" },
        } as SearchEngineResult,
      ])
    ).toBe("TOKEN-1");
  });

  it("builds the merged search service response", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-18T12:00:00Z"));

    const result = buildSearchServiceResponse({
      request: {
        query: "tokyo weather",
        mode: "normal",
        seriesId: "SERIES-1",
      } as SearchRequest,
      engines: ["google_search"],
      continuationToken: "TOKEN-1",
      merged: {
        summaryText: "summary",
        rawText: "raw text",
        sources: [],
        metadata: { origin: "test" },
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        mode: "normal",
        engine: "google_search",
        continuationToken: "TOKEN-1",
        summaryText: "summary",
        rawText: "raw text",
        metadata: expect.objectContaining({
          execution: "single",
          seriesId: "SERIES-1",
          subsequentRequestToken: "TOKEN-1",
        }),
      })
    );

    vi.useRealTimers();
  });
});
