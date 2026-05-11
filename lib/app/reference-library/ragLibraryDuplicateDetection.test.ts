import { describe, expect, it } from "vitest";
import {
  buildRagLibraryDuplicateGroups,
  buildTextVector,
  cosineSimilarity,
  normalizeDuplicateText,
} from "@/lib/app/reference-library/ragLibraryDuplicateDetection";
import type { RagLibraryStoredDocument } from "@/lib/app/reference-library/ragLibraryTypes";

function documentFixture(
  overrides: Partial<RagLibraryStoredDocument>
): RagLibraryStoredDocument {
  return {
    id: "doc-1",
    libraryItemId: "library-1",
    sourceId: "source-1",
    itemType: "ingested_file",
    title: "Document",
    summary: "",
    contentHash: "hash-1",
    chunks: [],
    ...overrides,
  };
}

describe("ragLibraryDuplicateDetection", () => {
  it("normalizes punctuation and whitespace for exact chunk comparisons", () => {
    expect(normalizeDuplicateText(" Title:  Farmers 360 link. ")).toBe(
      normalizeDuplicateText("title farmers 360 link")
    );
  });

  it("detects documents with the same content hash", () => {
    const groups = buildRagLibraryDuplicateGroups([
      documentFixture({
        id: "doc-1",
        title: "A",
        contentHash: "same",
        chunks: [
          {
            id: "chunk-1",
            documentId: "doc-1",
            chunkIndex: 0,
            content: "alpha",
            tokenEstimate: 10,
          },
        ],
      }),
      documentFixture({
        id: "doc-2",
        title: "B",
        contentHash: "same",
        chunks: [
          {
            id: "chunk-2",
            documentId: "doc-2",
            chunkIndex: 0,
            content: "beta",
            tokenEstimate: 12,
          },
        ],
      }),
    ]);

    expect(groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reason: "same_content_hash",
          documentIds: ["doc-1", "doc-2"],
          chunkCount: 2,
          totalTokenEstimate: 22,
        }),
      ])
    );
  });

  it("detects repeated chunk text across different documents", () => {
    const repeated =
      "This chunk is intentionally long enough to be treated as a duplicate candidate across documents.";
    const groups = buildRagLibraryDuplicateGroups([
      documentFixture({
        id: "doc-1",
        title: "A",
        contentHash: "hash-a",
        chunks: [
          {
            id: "chunk-1",
            documentId: "doc-1",
            chunkIndex: 0,
            content: repeated,
            tokenEstimate: 20,
          },
        ],
      }),
      documentFixture({
        id: "doc-2",
        title: "B",
        contentHash: "hash-b",
        chunks: [
          {
            id: "chunk-2",
            documentId: "doc-2",
            chunkIndex: 0,
            content: repeated,
            tokenEstimate: 21,
          },
        ],
      }),
    ]);

    expect(groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reason: "same_chunk_text",
          documentCount: 2,
          chunkCount: 2,
          totalTokenEstimate: 41,
        }),
      ])
    );
  });

  it("keeps n-gram helpers available for local text diagnostics", () => {
    const left = buildTextVector("returnee school admission IB course");
    const right = buildTextVector("returnee school admissions and IB courses");

    expect(cosineSimilarity(left, right)).toBeGreaterThan(0.5);
  });
});
