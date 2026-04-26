import { describe, expect, it } from "vitest";
import {
  applySearchContextLibrarySummary,
  buildSearchContextLibrarySummaryRequest,
} from "@/hooks/useSearchHistory";
import type { SearchContext } from "@/types/task";

function createSearchContext(overrides: Partial<SearchContext> = {}): SearchContext {
  return {
    rawResultId: "RAW-1",
    query: "ウクライナ 戦況",
    createdAt: "2026-04-24T00:00:00.000Z",
    rawText:
      "Google Search\n- 記事A\n  URL: https://example.com/a\n  Snippet: 東部戦線の状況と支援動向\n\n- 記事B\n  URL: https://example.com/b\n  Snippet: 停戦交渉と各国の対応",
    summaryText: "generic",
    sources: [],
    ...overrides,
  };
}

describe("useSearchHistory helpers", () => {
  it("builds a shared library-summary request from raw search evidence", () => {
    expect(
      buildSearchContextLibrarySummaryRequest(createSearchContext())
    ).toEqual({
      title: "ウクライナ 戦況",
      text:
        "Google Search\n- 記事A\nURL: https://example.com/a\nSnippet: 東部戦線の状況と支援動向\n- 記事B\nURL: https://example.com/b\nSnippet: 停戦交渉と各国の対応",
    });
  });

  it("omits the Google AI Mode engine label from library-summary input", () => {
    expect(
      buildSearchContextLibrarySummaryRequest(
        createSearchContext({
          query: "OpenAI API",
          rawText: [
            "Google AI Mode",
            "",
            "### Code Interpreter",
            "- Python code can run in a sandbox. [refs: 1, 2]",
            "",
            "### References",
            "[0] [OpenAI API](https://example.com)",
          ].join("\n"),
        })
      )
    ).toEqual({
      title: "OpenAI API",
      text: "### Code Interpreter\n- Python code can run in a sandbox.",
    });
  });

  it("returns null when there is no usable search evidence", () => {
    expect(
      buildSearchContextLibrarySummaryRequest(
        createSearchContext({ rawText: "" })
      )
    ).toBeNull();
  });

  it("skips re-summarizing search contexts that already carry the shared summary flag", () => {
    expect(
      buildSearchContextLibrarySummaryRequest(
        createSearchContext({
          summaryText: "shared summary",
          metadata: {
            librarySummaryGenerated: true,
          },
        })
      )
    ).toBeNull();
  });

  it("marks contexts that were upgraded through the shared library summary flow", () => {
    expect(
      applySearchContextLibrarySummary(
        createSearchContext(),
        "検索結果全体の要点をまとめた要約"
      )
    ).toMatchObject({
      summaryText: "検索結果全体の要点をまとめた要約",
      metadata: {
        librarySummaryGenerated: true,
      },
    });
  });
});
