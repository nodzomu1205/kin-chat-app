import { describe, expect, it } from "vitest";
import {
  extractInlineSearchQuery,
  resolveAiContinuationArtifacts,
  resolveProtocolLimitViolation,
  resolveProtocolSearchOverrides,
  resolveRequestAnswerContext,
} from "@/lib/app/sendToGptFlowContext";

describe("sendToGptFlowContext", () => {
  it("resolves a request-answer context from REQ input", () => {
    const result = resolveRequestAnswerContext({
      rawText: "REQ A001 question: Here is the answer",
      findPendingRequest: (requestId) =>
        requestId === "A001"
          ? {
              id: "A001",
              taskId: "TASK-1",
              actionId: "A001",
              body: "question",
            }
          : null,
    });

    expect(result.requestAnswerBody).toBe("Here is the answer");
    expect(result.requestToAnswer).toMatchObject({
      id: "A001",
      taskId: "TASK-1",
    });
  });

  it("resolves AI continuation artifacts when AI mode stays active", () => {
    const result = resolveAiContinuationArtifacts({
      effectiveSearchMode: "ai",
      effectiveSearchEngines: ["google_ai_mode"],
      continuationDetails: {
        cleanQuery: "farmers 360",
        seriesId: "SERIES-1",
      } as ReturnType<typeof import("@/lib/search-domain/continuations").parseSearchContinuation>,
      searchRequestQuery: "farmers 360",
      effectiveParsedSearchQuery: "farmers 360",
      getContinuationTokenForSeries: (seriesId) => `TOKEN:${seriesId}`,
      getAskAiModeLinkForQuery: (query) => `LINK:${query}`,
    });

    expect(result).toEqual({
      searchSeriesId: "SERIES-1",
      continuationToken: "TOKEN:SERIES-1",
      askAiModeLink: "",
    });
  });

  it("falls back to an Ask AI mode link when no continuation token exists", () => {
    const result = resolveAiContinuationArtifacts({
      effectiveSearchMode: "ai",
      effectiveSearchEngines: ["google_ai_mode"],
      continuationDetails: {
        cleanQuery: "farmers 360",
        seriesId: "SERIES-1",
      } as ReturnType<typeof import("@/lib/search-domain/continuations").parseSearchContinuation>,
      searchRequestQuery: "farmers 360",
      effectiveParsedSearchQuery: "farmers 360",
      getContinuationTokenForSeries: () => "",
      getAskAiModeLinkForQuery: (query) => `LINK:${query}`,
    });

    expect(result).toEqual({
      searchSeriesId: "SERIES-1",
      continuationToken: "",
      askAiModeLink: "LINK:farmers 360",
    });
  });

  it("maps protocol search overrides from the requested engine", () => {
    expect(
      resolveProtocolSearchOverrides({
        requestedEngine: "google_news",
        requestedLocation: "Japan",
        fallbackMode: "normal",
        fallbackEngines: ["google_search"],
        fallbackLocation: "US",
      })
    ).toEqual({
      searchMode: "news",
      searchEngines: ["google_news"],
      searchLocation: "Japan",
    });
  });

  it("extracts inline search query text", () => {
    expect(extractInlineSearchQuery("検索: farmers 360")).toBe("farmers 360");
  });

  it("resolves protocol limit violations in priority order", () => {
    expect(
      resolveProtocolLimitViolation({
        askGptEvent: { taskId: "TASK-1", actionId: "A001" },
        searchRequestEvent: { taskId: "TASK-1", actionId: "S001" },
        getProtocolLimitViolation: ({ type, actionId }) => `${type}:${actionId}`,
      })
    ).toBe("ask_gpt:A001");
  });
});
