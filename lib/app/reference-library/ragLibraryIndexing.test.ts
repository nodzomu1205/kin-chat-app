import { describe, expect, it } from "vitest";
import type { ReferenceLibraryItem } from "@/types/chat";
import { chunkRagLibraryDocument } from "@/lib/app/reference-library/ragLibraryChunking";
import { buildRagLibraryReferenceContext } from "@/lib/app/reference-library/ragLibraryContext";
import {
  buildRagLibraryDocument,
  buildRagLibraryDocumentContent,
} from "@/lib/app/reference-library/ragLibraryIndexing";

function createLibraryItem(overrides: Partial<ReferenceLibraryItem> = {}): ReferenceLibraryItem {
  return {
    id: "lib-1",
    sourceId: "doc-1",
    itemType: "ingested_file",
    artifactType: "reference_note",
    title: "Cotton supplier brief",
    subtitle: "Supplier A / yarn",
    summary: "Supplier A handles cotton yarn for premium apparel.",
    excerptText: [
      "Supplier A has two spinning sites.",
      "",
      "The main risk is lead-time volatility during peak seasons.",
    ].join("\n"),
    createdAt: "2026-05-10T00:00:00.000Z",
    updatedAt: "2026-05-10T00:00:00.000Z",
    ...overrides,
  };
}

describe("RAG library indexing", () => {
  it("builds a stable RAG document from a reference library item", () => {
    const document = buildRagLibraryDocument(createLibraryItem(), {
      customer: "Customer X",
      product: "Cotton yarn",
    });

    expect(document).toMatchObject({
      libraryItemId: "lib-1",
      sourceId: "doc-1",
      itemType: "ingested_file",
      artifactType: "reference_note",
      title: "Cotton supplier brief",
      summary: "Supplier A handles cotton yarn for premium apparel.",
      metadata: expect.objectContaining({
        customer: "Customer X",
        product: "Cotton yarn",
        sourceId: "doc-1",
      }),
    });
    expect(document?.content).toContain("Title: Cotton supplier brief");
    expect(document?.content).toContain("Excerpt: Supplier A has two spinning sites.");
    expect(document?.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("returns null when a library item has no indexable text", () => {
    const document = buildRagLibraryDocument(
      createLibraryItem({
        title: "",
        subtitle: "",
        summary: "",
        excerptText: "",
      })
    );

    expect(document).toBeNull();
  });

  it("includes search sources as indexable context", () => {
    const content = buildRagLibraryDocumentContent(
      createLibraryItem({
        itemType: "search",
        sources: [
          {
            title: "Cotton market report",
            link: "https://example.test/report",
            snippet: "Demand rose in Q2.",
          },
        ],
      })
    );

    expect(content).toContain("Sources:");
    expect(content).toContain("Cotton market report | https://example.test/report | Demand rose in Q2.");
  });

  it("chunks RAG documents with item metadata preserved", () => {
    const document = buildRagLibraryDocument(
      createLibraryItem({
        excerptText: Array.from({ length: 8 }, (_, index) =>
          `Paragraph ${index + 1}: supplier capability and delivery constraints.`
        ).join("\n\n"),
      }),
      { category: "supplier" }
    );

    expect(document).not.toBeNull();
    const chunks = chunkRagLibraryDocument(document!, {
      targetChars: 180,
      maxChars: 240,
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toMatchObject({
      libraryItemId: "lib-1",
      chunkIndex: 0,
      metadata: expect.objectContaining({
        title: "Cotton supplier brief",
        category: "supplier",
        itemType: "ingested_file",
      }),
    });
    expect(chunks.every((chunk) => chunk.tokenEstimate > 0)).toBe(true);
  });

  it("formats RAG matches as a separate library context block", () => {
    const context = buildRagLibraryReferenceContext({
      matches: [
        {
          libraryItemId: "lib-1",
          title: "Cotton supplier brief",
          itemType: "ingested_file",
          chunkIndex: 2,
          content: "Supplier A lead-time volatility is the main risk.",
          similarity: 0.81234,
        },
      ],
    });

    expect(context).toContain("<<RAG_LIBRARY_CONTEXT>>");
    expect(context).toContain("LIBRARY_ITEM_ID: lib-1");
    expect(context).toContain("SIMILARITY: 0.8123");
    expect(context).toContain("Supplier A lead-time volatility");
    expect(context).toContain("<<END_RAG_LIBRARY_CONTEXT>>");
  });
});
