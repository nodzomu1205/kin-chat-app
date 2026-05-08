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

  it("does not select medium-length boilerplate without query evidence", () => {
    const snippet = buildSnippetFromHtml({
      html: [
        "<p>Customer Support and Bloomberg Terminal Demo Request information</p>",
        "<p>Privacy Policy and newsletter subscription settings are available here</p>",
      ].join(""),
      query: "iran situation",
      fallbackSnippet: "fallback",
    });

    expect(
      scoreLine(
        "Customer Support and Bloomberg Terminal Demo Request information",
        "iran situation"
      )
    ).toBeLessThanOrEqual(0);
    expect(snippet).toBe("fallback");
  });

  it("matches compact Japanese queries through query fragments", () => {
    const snippet = buildSnippetFromHtml({
      html: "<p>イランの地域情勢について、各国政府が警戒を強めています。</p>",
      query: "イラン情勢",
      fallbackSnippet: "fallback",
    });

    expect(snippet).toContain("イラン");
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
