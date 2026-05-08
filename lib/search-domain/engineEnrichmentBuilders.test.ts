import { describe, expect, it } from "vitest";
import {
  enrichSnippetResults,
  extractOrganicResults,
  mergeResultSnippets,
} from "@/lib/search-domain/engineEnrichmentBuilders";

describe("engineEnrichmentBuilders", () => {
  it("extracts organic-style result arrays", () => {
    expect(
      extractOrganicResults(
        { organic_results: [{ title: "A" }] },
        "organic_results"
      )
    ).toEqual([{ title: "A" }]);
  });

  it("keeps original snippets and appends extracted evidence", async () => {
    const results = await enrichSnippetResults({
      items: [{ title: "A", link: "https://example.com", snippet: "old" }],
      limit: 5,
      query: "query",
      fetchPageSnippet: async () => "new snippet",
    });

    expect(results).toEqual([
      {
        title: "A",
        link: "https://example.com",
        snippet: "old\n\nExtracted evidence:\nnew snippet",
      },
    ]);
  });

  it("falls back to the original snippet when page extraction is empty", () => {
    expect(
      mergeResultSnippets({
        originalSnippet: "SerpAPI snippet",
        fetchedSnippet: "",
      })
    ).toBe("SerpAPI snippet");
  });
});
