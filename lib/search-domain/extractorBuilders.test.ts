import { describe, expect, it } from "vitest";
import {
  buildSearchResultSnippetSeed,
  buildSnippetFromHtml,
  htmlToLines,
  scoreLine,
  stripHtml,
} from "@/lib/search-domain/extractorBuilders";

describe("extractorBuilders", () => {
  it("strips html into readable text lines", () => {
    expect(stripHtml("<p>Hello</p><p>World</p>")).toContain("Hello");
    expect(htmlToLines("<p>Hello</p><p>World</p>")).toEqual(["Hello", "World"]);
  });

  it("scores and builds snippets from html", () => {
    const snippet = buildSnippetFromHtml({
      html: "<p>Tokyo weather forecast is sunny and warm today.</p>",
      query: "tokyo weather",
      fallbackSnippet: "fallback",
    });

    expect(scoreLine("Tokyo weather forecast is sunny today.", "tokyo weather")).toBeGreaterThan(0);
    expect(snippet).toContain("Tokyo weather");
  });

  it("builds snippet seed from raw result items", () => {
    expect(
      buildSearchResultSnippetSeed({
        title: "Title",
        link: "https://example.com",
        snippet: "Snippet",
      })
    ).toEqual({
      title: "Title",
      link: "https://example.com",
      snippet: "Snippet",
    });
  });
});
