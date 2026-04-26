import { describe, expect, it } from "vitest";
import {
  buildLibraryItemsAggregateKinSysInfo,
  buildLibraryItemsAggregateText,
} from "@/lib/app/reference-library/libraryItemAggregation";
import type { ReferenceLibraryItem } from "@/types/chat";

function createItem(overrides: Partial<ReferenceLibraryItem> = {}): ReferenceLibraryItem {
  return {
    id: "doc:1",
    sourceId: "doc:1",
    itemType: "ingested_file",
    title: "Alpha",
    subtitle: "取込文書 / alpha.txt",
    summary: "Short summary",
    excerptText: "Long detail",
    createdAt: "2026-04-26T00:00:00.000Z",
    updatedAt: "2026-04-26T00:00:00.000Z",
    filename: "alpha.txt",
    ...overrides,
  };
}

describe("buildLibraryItemsAggregateText", () => {
  it("builds an index-only aggregate", () => {
    const text = buildLibraryItemsAggregateText({
      items: [createItem(), createItem({ id: "doc:2", title: "Beta" })],
      mode: "index",
    });

    expect(text).toContain("Items: 2");
    expect(text).toContain("1. Alpha");
    expect(text).toContain("2. Beta");
    expect(text).not.toContain("1. Alpha [ingested_file] 取込文書 / alpha.txt\n\n2. Beta");
    expect(text).not.toContain("Summary:");
    expect(text).not.toContain("Detail:");
  });

  it("adds summaries without detail in summary mode", () => {
    const text = buildLibraryItemsAggregateText({
      items: [createItem()],
      mode: "summary",
    });

    expect(text).toContain("1. Alpha [ingested_file] 取込文書 / alpha.txt\n\nSummary:");
    expect(text).toContain("Summary: Short summary");
    expect(text).not.toContain("Detail:");
  });

  it("adds detail in detail mode", () => {
    const text = buildLibraryItemsAggregateText({
      items: [createItem()],
      mode: "detail",
    });

    expect(text).toContain("Summary: Short summary");
    expect(text).toContain("Summary: Short summary\n\nDetail:");
    expect(text).toContain("Detail:");
    expect(text).toContain("Long detail");
  });

  it("does not duplicate the summary inside the detail block", () => {
    const text = buildLibraryItemsAggregateText({
      items: [
        createItem({
          summary: "Summary text",
          excerptText: "Body text",
        }),
      ],
      mode: "detail",
    });

    expect(text.match(/Summary:/g)).toHaveLength(1);
    expect(text).toContain("Detail:\nBody text");
  });
});

describe("buildLibraryItemsAggregateKinSysInfo", () => {
  it("wraps multiple items in one SYS_INFO block", () => {
    const text = buildLibraryItemsAggregateKinSysInfo({
      items: [createItem(), createItem({ id: "doc:2", title: "Beta" })],
      mode: "detail",
    });

    expect(text).toContain("<<SYS_INFO>>");
    expect(text).toContain("TITLE: Library Data");
    expect(text).toContain("1. Alpha");
    expect(text).toContain("2. Beta");
    expect(text).toContain("<<END_SYS_INFO>>");
  });
});
