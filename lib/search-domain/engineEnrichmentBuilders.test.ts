import { describe, expect, it } from "vitest";
import {
  enrichSnippetResults,
  extractOrganicResults,
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

  it("enriches snippet results through the shared fetcher", async () => {
    const results = await enrichSnippetResults({
      items: [{ title: "A", link: "https://example.com", snippet: "old" }],
      limit: 5,
      query: "query",
      fetchPageSnippet: async () => "new snippet",
    });

    expect(results).toEqual([
      { title: "A", link: "https://example.com", snippet: "new snippet" },
    ]);
  });
});
