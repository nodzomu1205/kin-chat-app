import { describe, expect, it } from "vitest";
import {
  buildReferenceLibraryContext,
  estimateReferenceLibraryTokens,
  getTaskLibraryItemBySelection,
  moveReferenceLibraryOrderItem,
  reconcileReferenceLibraryOrder,
  resolveSelectedLibraryItemId,
} from "@/lib/app/reference-library/referenceLibraryState";

describe("referenceLibraryState", () => {
  it("keeps stored ordering for existing items and prepends new items", () => {
    expect(
      reconcileReferenceLibraryOrder(
        ["doc:3", "doc:2", "doc:1"],
        ["doc:2", "doc:1"]
      )
    ).toEqual(["doc:3", "doc:2", "doc:1"]);
  });

  it("drops removed items from stored ordering", () => {
    expect(
      reconcileReferenceLibraryOrder(["doc:2", "doc:1"], ["doc:3", "doc:2", "doc:1"])
    ).toEqual(["doc:2", "doc:1"]);
  });

  it("moves items up and down without mutating unsupported positions", () => {
    expect(
      moveReferenceLibraryOrderItem(["a", "b", "c"], "b", "up")
    ).toEqual(["b", "a", "c"]);
    expect(
      moveReferenceLibraryOrderItem(["a", "b", "c"], "b", "down")
    ).toEqual(["a", "c", "b"]);
    expect(
      moveReferenceLibraryOrderItem(["a", "b", "c"], "a", "up")
    ).toEqual(["a", "b", "c"]);
  });

  it("clears the selected item id when the item no longer exists", () => {
    expect(
      resolveSelectedLibraryItemId("doc:2", [{ id: "doc:1" }, { id: "doc:3" }])
    ).toBe("");
  });

  it("resolves the selected task library item from the current library items", () => {
    expect(
      getTaskLibraryItemBySelection(
        [
          {
            id: "doc:1",
            itemType: "search",
            title: "Title",
            summary: "Summary",
            excerptText: "",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ] as never,
        "doc:1"
      )?.id
    ).toBe("doc:1");
  });

  it("builds excerpt and sources only when the effective mode requires them", () => {
    const context = buildReferenceLibraryContext({
      autoLibraryReferenceEnabled: true,
      libraryReferenceCount: 1,
      libraryItems: [
        {
          id: "search:1",
          itemType: "search",
          title: "Tokyo housing",
          summary: "Summary",
          excerptText: "Long excerpt",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          sources: [
            { title: "Source A", link: "https://example.com/a" },
            { title: "Source B", link: "https://example.com/b" },
          ],
        },
      ] as never,
      libraryReferenceMode: "summary_only",
      libraryItemModeOverrides: {
        "search:1": "summary_with_excerpt",
      },
      sourceDisplayCount: 1,
    });

    expect(context).toContain("EXCERPT: Long excerpt");
    expect(context).toContain("SOURCES:");
    expect(context).toContain("Source A");
    expect(context).not.toContain("Source B");
  });

  it("keeps the full excerpt text when summary with excerpt is enabled", () => {
    const longExcerpt = `start ${"x".repeat(1300)} end`;

    const context = buildReferenceLibraryContext({
      autoLibraryReferenceEnabled: true,
      libraryReferenceCount: 1,
      libraryItems: [
        {
          id: "doc:1",
          itemType: "ingested_file",
          title: "Long source",
          summary: "Summary",
          excerptText: longExcerpt,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ] as never,
      libraryReferenceMode: "summary_with_excerpt",
      libraryItemModeOverrides: {},
      sourceDisplayCount: 1,
    });

    expect(context).toContain(`EXCERPT: ${longExcerpt}`);
    expect(context).toContain(" end");
  });

  it("estimates tokens from the generated context", () => {
    expect(
      estimateReferenceLibraryTokens({
        autoLibraryReferenceEnabled: true,
        libraryReferenceCount: 1,
        libraryItems: [
          {
            id: "doc:1",
            itemType: "search",
            title: "Title",
            summary: "Summary",
            excerptText: "",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ] as never,
        libraryReferenceMode: "summary_only",
        libraryItemModeOverrides: {},
        sourceDisplayCount: 3,
      })
    ).toBeGreaterThan(0);
  });
});
