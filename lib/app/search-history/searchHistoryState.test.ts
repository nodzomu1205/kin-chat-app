import { describe, expect, it } from "vitest";
import {
  getAskAiModeLinkFromSearchHistory,
  getContinuationTokenFromSearchHistory,
  getVisibleSearchHistory,
  moveSearchHistoryEntry,
  resolveTaskSearchContext,
  resolveSelectedSearchResultId,
} from "@/lib/app/search-history/searchHistoryState";
import type { SearchContext } from "@/types/task";

function makeSearchContext(rawResultId: string): SearchContext {
  return {
    rawResultId,
    query: `query-${rawResultId}`,
    createdAt: "2026-04-17T00:00:00.000Z",
    rawText: "",
    summaryText: "",
    sources: [],
  };
}

describe("searchHistoryState", () => {
  it("clips visible history to the configured limit", () => {
    expect(
      getVisibleSearchHistory(
        [makeSearchContext("a"), makeSearchContext("b"), makeSearchContext("c")],
        2
      ).map((item) => item.rawResultId)
    ).toEqual(["a", "b"]);
  });

  it("keeps the selected result when it still exists in visible history", () => {
    expect(
      resolveSelectedSearchResultId({
        selectedTaskSearchResultId: "b",
        visibleSearchHistory: [makeSearchContext("a"), makeSearchContext("b")],
        lastSearchContext: makeSearchContext("z"),
      })
    ).toBe("b");
  });

  it("keeps the selected result when it matches the last search context", () => {
    expect(
      resolveSelectedSearchResultId({
        selectedTaskSearchResultId: "z",
        visibleSearchHistory: [makeSearchContext("a"), makeSearchContext("b")],
        lastSearchContext: makeSearchContext("z"),
      })
    ).toBe("z");
  });

  it("clears the selected result when it no longer exists", () => {
    expect(
      resolveSelectedSearchResultId({
        selectedTaskSearchResultId: "missing",
        visibleSearchHistory: [makeSearchContext("a"), makeSearchContext("b")],
        lastSearchContext: makeSearchContext("z"),
      })
    ).toBe("");
  });

  it("moves search history entries without changing unsupported positions", () => {
    expect(
      moveSearchHistoryEntry({
        searchHistory: [makeSearchContext("a"), makeSearchContext("b"), makeSearchContext("c")],
        rawResultId: "b",
        direction: "up",
      }).map((item) => item.rawResultId)
    ).toEqual(["b", "a", "c"]);

    expect(
      moveSearchHistoryEntry({
        searchHistory: [makeSearchContext("a"), makeSearchContext("b"), makeSearchContext("c")],
        rawResultId: "a",
        direction: "up",
      }).map((item) => item.rawResultId)
    ).toEqual(["a", "b", "c"]);
  });

  it("prefers the selected visible search context before falling back", () => {
    expect(
      resolveTaskSearchContext({
        visibleSearchHistory: [makeSearchContext("a"), makeSearchContext("b")],
        resolvedSelectedTaskSearchResultId: "b",
        lastSearchContext: makeSearchContext("z"),
      })?.rawResultId
    ).toBe("b");
  });

  it("falls back to the last search context when the selected item only exists there", () => {
    expect(
      resolveTaskSearchContext({
        visibleSearchHistory: [makeSearchContext("a")],
        resolvedSelectedTaskSearchResultId: "z",
        lastSearchContext: makeSearchContext("z"),
      })?.rawResultId
    ).toBe("z");
  });

  it("reads continuation tokens from the last context first", () => {
    expect(
      getContinuationTokenFromSearchHistory({
        seriesId: "series-1",
        visibleSearchHistory: [
          {
            ...makeSearchContext("a"),
            metadata: {
              seriesId: "series-1",
              subsequentRequestToken: "NEXT-FALLBACK",
            },
          },
        ],
        lastSearchContext: {
          ...makeSearchContext("z"),
          seriesId: "series-1",
          continuationToken: "NEXT-DIRECT",
        },
      })
    ).toBe("NEXT-DIRECT");
  });

  it("prefers serpapi ask-ai links before generic links", () => {
    expect(
      getAskAiModeLinkFromSearchHistory({
        query: "Tokyo housing",
        visibleSearchHistory: [
          {
            ...makeSearchContext("a"),
            metadata: {
              askAiModeItems: [
                {
                  title: "Tokyo housing",
                  link: "https://example.com/link",
                  serpapi_link: "https://example.com/serpapi",
                },
              ],
            },
          },
        ],
        lastSearchContext: null,
      })
    ).toBe("https://example.com/serpapi");
  });
});
