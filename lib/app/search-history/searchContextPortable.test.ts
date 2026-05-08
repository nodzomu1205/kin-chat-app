import { describe, expect, it } from "vitest";
import {
  buildPortableSearchContextImport,
  buildSearchContextFromLibraryItem,
  buildSearchContextSidecarFileName,
  buildSearchContextSidecarText,
  parseSearchContextSidecarText,
} from "@/lib/app/search-history/searchContextPortable";
import type { ReferenceLibraryItem } from "@/types/chat";

describe("searchContextPortable", () => {
  it("builds a portable search context from a search library item", () => {
    const item: ReferenceLibraryItem = {
      id: "search:RAW-1",
      sourceId: "RAW-1",
      itemType: "search",
      title: "Cotton market",
      subtitle: "Search",
      summary: "summary",
      excerptText: "raw result",
      createdAt: "2026-05-08T00:00:00.000Z",
      updatedAt: "2026-05-08T00:00:00.000Z",
      rawResultId: "RAW-1",
      sources: [
        {
          title: "Video",
          link: "https://youtube.com/watch?v=abc",
          sourceType: "youtube_video",
          videoId: "abc",
        },
      ],
      askAiModeItems: [{ title: "Ask", link: "https://example.com/ask" }],
    };

    const context = buildSearchContextFromLibraryItem(item);

    expect(context?.rawResultId).toBe("RAW-1");
    expect(context?.sources[0]?.sourceType).toBe("youtube_video");
    expect(context?.metadata?.askAiModeItems).toEqual(item.askAiModeItems);
  });

  it("round-trips a search context sidecar", () => {
    const context = {
      rawResultId: "RAW-1",
      query: "Cotton market",
      summaryText: "summary",
      rawText: "raw result",
      sources: [{ title: "Source", link: "https://example.com" }],
      createdAt: "2026-05-08T00:00:00.000Z",
    };

    const text = buildSearchContextSidecarText({
      title: "Cotton market",
      filename: "Cotton market.txt",
      context,
    });

    expect(parseSearchContextSidecarText(text)).toEqual({
      ...context,
      metadata: {
        librarySummaryGenerated: true,
      },
    });
  });

  it("marks exported search library summaries as reusable", () => {
    const context = buildSearchContextFromLibraryItem({
      id: "search:RAW-1",
      sourceId: "RAW-1",
      itemType: "search",
      title: "Cotton market",
      subtitle: "Search",
      summary: "Existing search summary",
      excerptText: "raw result",
      createdAt: "2026-05-08T00:00:00.000Z",
      updatedAt: "2026-05-08T00:00:00.000Z",
      rawResultId: "RAW-1",
      sources: [],
    });

    expect(context?.summaryText).toBe("Existing search summary");
    expect(context?.metadata?.librarySummaryGenerated).toBe(true);
  });

  it("uses a stable search sidecar filename", () => {
    expect(
      buildSearchContextSidecarFileName({ filename: "Cotton market.txt" })
    ).toBe("Cotton market.search-context.json");
  });

  it("builds an imported search context record with task context", () => {
    const imported = buildPortableSearchContextImport({
      context: {
        rawResultId: "RAW-1",
        query: "",
        summaryText: "",
        rawText: "raw result",
        sources: [],
        createdAt: "2026-05-08T00:00:00.000Z",
        taskId: "old-task",
      },
      filename: "Iran.search-context.json",
      taskId: "task-1",
    });

    expect(imported).toMatchObject({
      title: "Iran.search-context.json",
      charCount: 10,
      context: {
        rawResultId: "RAW-1",
        taskId: "task-1",
      },
    });
  });
});
