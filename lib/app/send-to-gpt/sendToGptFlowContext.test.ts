import { describe, expect, it } from "vitest";
import {
  extractProtocolInteractionContext,
  extractInlineSearchQuery,
  resolveDerivedSearchContext,
  resolveAiContinuationArtifacts,
  resolveProtocolLimitViolation,
  resolveProtocolSearchOverrides,
  resolveRequestAnswerContext,
} from "@/lib/app/send-to-gpt/sendToGptFlowContext";
import {
  buildDerivedSearchContext,
  buildProtocolInteractionContext,
} from "@/lib/app/send-to-gpt/sendToGptFlowContextBuilders";

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

  it("builds protocol interaction context from extracted task events", () => {
    const result = buildProtocolInteractionContext({
      rawText:
        "<<SYS_SEARCH_REQUEST>>\nTASK_ID: TASK-1\nACTION_ID: S001\nQUERY: farmers 360\n<<END_SYS_SEARCH_REQUEST>>",
      findPendingRequest: () => null,
      resolveRequestAnswerContext: () => ({
        requestToAnswer: null,
        requestAnswerBody: "",
      }),
    });

    expect(result.searchRequestEvent).toMatchObject({
      taskId: "TASK-1",
      actionId: "S001",
      query: "farmers 360",
    });
  });

  it("builds derived search context from inline query and fallback settings", () => {
    const result = buildDerivedSearchContext({
      parsedInput: {
        freeText: "body",
      },
      searchRequestEvent: undefined,
      searchMode: "normal",
      searchEngines: ["google_search"],
      searchLocation: "Japan",
      inlineSearchQuery: "farmers 360",
      resolveProtocolSearchOverrides,
      resolveAiContinuationArtifacts,
      getContinuationTokenForSeries: () => "",
      getAskAiModeLinkForQuery: (query) => `LINK:${query}`,
    });

    expect(result).toMatchObject({
      inlineSearchQuery: "farmers 360",
      effectiveParsedSearchQuery: "farmers 360",
      effectiveSearchMode: "normal",
      effectiveSearchEngines: ["google_search"],
      effectiveSearchLocation: "Japan",
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

  it("delegates protocol interaction and derived search context through public helpers", () => {
    expect(
      extractProtocolInteractionContext({
        rawText:
          "<<SYS_ASK_GPT>>\nTASK_ID: TASK-1\nACTION_ID: A001\nBODY: Need answer\n<<END_SYS_ASK_GPT>>",
        findPendingRequest: () => null,
      }).askGptEvent
    ).toMatchObject({
      taskId: "TASK-1",
      actionId: "A001",
    });

    expect(
      resolveDerivedSearchContext({
        rawText: "plain input",
        parsedInput: {
          searchQuery: "farmers 360",
          freeText: "body",
        },
        searchMode: "normal",
        searchEngines: ["google_search"],
        searchLocation: "Japan",
        getContinuationTokenForSeries: () => "",
        getAskAiModeLinkForQuery: (query) => `LINK:${query}`,
      })
    ).toMatchObject({
      effectiveParsedSearchQuery: "farmers 360",
      effectiveSearchMode: "normal",
      effectiveSearchEngines: ["google_search"],
      effectiveSearchLocation: "Japan",
    });
  });
});
