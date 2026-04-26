import { describe, expect, it } from "vitest";
import {
  buildAiModePayload,
  buildLocalSearchPayload,
  buildGoogleSearchPayload,
  buildMergedNormalizedPayload,
  collectLocalLikeItems,
  extractAiModeTables,
  normalizeLocalResults,
  normalizeYoutubeSources,
} from "@/lib/search-domain/normalizerBuilders";

describe("normalizerBuilders", () => {
  it("builds a google search payload", () => {
    const payload = buildGoogleSearchPayload({
      request: { query: "tokyo weather" },
      sources: [
        {
          title: "Tokyo weather",
          link: "https://example.com/weather",
          sourceType: "organic",
        },
      ],
      askAiModeItems: [],
    });

    expect(payload.summaryText).toContain("tokyo weather");
    expect(payload.rawText).toContain("Google Search");
  });

  it("normalizes youtube sources with thumbnails", () => {
    const sources = normalizeYoutubeSources([
      {
        title: "Video",
        link: "https://www.youtube.com/watch?v=abc123",
        length: "1:23",
      },
    ]);

    expect(sources[0]).toEqual(
      expect.objectContaining({
        title: "Video",
        videoId: "abc123",
      })
    );
  });

  it("builds local payloads from local-like result containers through the facade", () => {
    const localItems = collectLocalLikeItems({
      place_result: {
        title: "Cafe Example",
        address: "Tokyo",
        rating: 4.5,
      },
    });
    const localResults = normalizeLocalResults(localItems);

    const payload = buildLocalSearchPayload({
      request: { query: "tokyo cafe" },
      engine: "google_local",
      localItems,
      localResults,
      sources: [],
    });

    expect(localResults[0]).toEqual(
      expect.objectContaining({
        title: "Cafe Example",
        link: expect.stringContaining("google.com/maps/search"),
      })
    );
    expect(payload.rawText).toContain("Google Local");
    expect(payload.localResults).toHaveLength(1);
  });

  it("merges payload sections", () => {
    const merged = buildMergedNormalizedPayload([
      {
        summaryText: "summary 1",
        rawText: "raw 1",
        sources: [{ title: "A", link: "https://a.test" }],
      },
      {
        summaryText: "summary 2",
        rawText: "raw 2",
        sources: [{ title: "B", link: "https://b.test" }],
      },
    ]);

    expect(merged.summaryText).toBe("summary 1\nsummary 2");
    expect(merged.rawText).toBe("raw 1\n\nraw 2");
    expect(merged.sources).toHaveLength(2);
  });

  it("builds an AI mode payload with table sections through the facade", () => {
    const aiTables = extractAiModeTables({
      answer: {
        result_table: [
          { name: "Alpha", score: 10 },
          { name: "Beta", score: 8 },
        ],
      },
    });

    const payload = buildAiModePayload({
      request: { query: "compare tools" },
      aiSummary: "Tool comparison summary",
      textBlocks: [{ type: "heading", snippet: "Top options" }],
      fullText: "",
      fallbackSources: [
        {
          title: "Reference",
          link: "https://example.com/reference",
          sourceType: "ai_mode",
        },
      ],
      aiTables,
      engine: "google_ai_mode",
    });

    expect(payload.rawText).toContain("Google AI Mode");
    expect(payload.rawText).toContain("Result Table");
    expect(payload.rawText).toContain("Supporting links");
  });

  it("keeps AI mode reconstructed markdown and code blocks", () => {
    const payload = buildAiModePayload({
      request: { query: "python example" },
      aiSummary: "Python example",
      textBlocks: [
        {
          type: "code_block",
          language: "python",
          code: "print('hello')",
        },
      ],
      fullText:
        "1. API利用の準備\n\n```python\nprint('hello')\n```\n\nUse code with caution.",
      fallbackSources: [],
      aiTables: [],
      engine: "google_ai_mode",
    });

    expect(payload.rawText).toContain("```python");
    expect(payload.rawText).toContain("print('hello')");
    expect(payload.rawText).toContain("Use code with caution.");
  });

  it("does not duplicate text blocks when reconstructed markdown is present", () => {
    const payload = buildAiModePayload({
      request: { query: "openai api" },
      aiSummary: "OpenAI API summary",
      textBlocks: [
        {
          type: "heading",
          snippet: "APIを使うメリット",
        },
        {
          type: "list",
          list: [{ snippet: "自動化できます。" }],
        },
      ],
      fullText: "### APIを使うメリット\n\n- 自動化できます。",
      fallbackSources: [],
      aiTables: [],
      engine: "google_ai_mode",
    });

    expect((payload.rawText || "").match(/自動化できます。/g)).toHaveLength(1);
  });
});
