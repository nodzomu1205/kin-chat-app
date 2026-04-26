import { describe, expect, it } from "vitest";
import { loadSearchHistoryState } from "@/lib/app/search-history/searchHistoryStorage";

function createStorage(values: Record<string, string>) {
  return {
    getItem: (key: string) => values[key] ?? null,
    setItem: () => undefined,
    removeItem: () => undefined,
  };
}

describe("searchHistoryStorage", () => {
  it("loads persisted search history settings and filters invalid entries", () => {
    const state = loadSearchHistoryState(
      createStorage({
        search_history_limit: "2",
        search_mode: "evidence",
        search_engines: JSON.stringify(["google_search", "bad_engine"]),
        search_location: "Tokyo",
        source_display_count: "4",
        last_search_context: JSON.stringify({
          rawResultId: "last",
          query: "latest",
        }),
        search_history: JSON.stringify([
          { rawResultId: "a", query: "A" },
          { rawResultId: "", query: "bad" },
          { rawResultId: "b", query: "B" },
          { rawResultId: "c", query: "C" },
        ]),
      })
    );

    expect(state).toMatchObject({
      searchHistoryLimit: 2,
      searchMode: "evidence",
      searchEngines: ["google_search"],
      searchLocation: "Tokyo",
      sourceDisplayCount: 4,
      lastSearchContext: {
        rawResultId: "last",
      },
    });
    expect(state.searchHistory.map((item) => item.rawResultId)).toEqual([
      "a",
      "b",
    ]);
  });
});
