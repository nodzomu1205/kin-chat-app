import { describe, expect, it } from "vitest";
import {
  buildExecutedSearchResult,
  normalizeSearchEngines,
  normalizeSearchExecutionParams,
  normalizeSearchMode,
} from "@/lib/server/chatgpt/searchExecution";

describe("searchExecution", () => {
  it("normalizes supported search modes safely", () => {
    expect(normalizeSearchMode("youtube")).toBe("youtube");
    expect(normalizeSearchMode("ai_first")).toBe("integrated");
    expect(normalizeSearchMode("unknown")).toBe("normal");
  });

  it("filters unsupported search engines", () => {
    expect(
      normalizeSearchEngines([
        "google_search",
        "youtube_search",
        "invalid_engine",
      ])
    ).toEqual(["google_search", "youtube_search"]);
  });

  it("normalizes optional execution params", () => {
    expect(
      normalizeSearchExecutionParams({
        searchMode: "youtube",
        searchEngines: ["youtube_search", "bad"],
        searchSeriesId: "  SER-1  ",
        searchContinuationToken: "  token-1  ",
        searchAskAiModeLink: "  https://example.com  ",
        searchLocation: "  Japan  ",
      })
    ).toEqual({
      safeSearchMode: "youtube",
      safeSearchEngines: ["youtube_search"],
      searchSeriesId: "SER-1",
      searchContinuationToken: "token-1",
      searchAskAiModeLink: "https://example.com",
      searchLocation: "Japan",
    });
  });

  it("builds normalized executed search result", () => {
    const result = buildExecutedSearchResult({
      summaryText: "summary here",
      continuationToken: "next-token",
      sources: [
        {
          title: "Video A",
          link: "https://example.com/a",
          channelName: "Channel A",
          duration: "10:00",
          viewCount: "12345",
        },
      ],
    });

    expect(result).toEqual({
      searchText: "summary here",
      returnedSearchContinuationToken: "next-token",
      sources: [
        {
          title: "Video A",
          link: "https://example.com/a",
          channelName: "Channel A",
          duration: "10:00",
          viewCount: "12345",
        },
      ],
      rawSources: [
        {
          title: "Video A",
          link: "https://example.com/a",
          channelName: "Channel A",
          duration: "10:00",
          viewCount: "12345",
        },
      ],
    });
  });
});
