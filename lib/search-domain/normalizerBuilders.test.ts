import { describe, expect, it } from "vitest";
import {
  buildGoogleSearchPayload,
  buildMergedNormalizedPayload,
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
});
