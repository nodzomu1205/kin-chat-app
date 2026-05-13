import { afterEach, describe, expect, it, vi } from "vitest";
import {
  compactRagLibraryDocuments,
  deleteRagLibraryDocument,
  fetchRagLibraryDocuments,
} from "@/lib/app/reference-library/ragLibraryDocumentsClient";

describe("ragLibraryDocumentsClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches DB documents with an optional limit", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          configured: true,
          documents: [],
          semanticDuplicateGroups: [
            {
              id: "semantic-1",
              reason: "similar_chunk",
              documentIds: ["doc-1", "doc-2"],
              chunkIds: ["chunk-1", "chunk-2"],
              titles: ["A", "B"],
              documentCount: 2,
              chunkCount: 2,
              totalTokenEstimate: 100,
              similarity: 0.72,
            },
          ],
        })
      )
    );

    await expect(
      fetchRagLibraryDocuments({
        limit: 25,
        duplicateLimit: 30,
        duplicateThreshold: 0.68,
      })
    ).resolves.toEqual({
      configured: true,
      documents: [],
      semanticDuplicateGroups: [
        {
          id: "semantic-1",
          reason: "similar_chunk",
          documentIds: ["doc-1", "doc-2"],
          chunkIds: ["chunk-1", "chunk-2"],
          titles: ["A", "B"],
          documentCount: 2,
          chunkCount: 2,
          totalTokenEstimate: 100,
          similarity: 0.72,
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/library-rag/documents?limit=25&duplicateLimit=30&duplicateThreshold=0.68",
      { method: "GET" }
    );
  });

  it("does not send a document limit when loading the full DB list", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          configured: true,
          documents: [],
          semanticDuplicateGroups: [],
        })
      )
    );

    await expect(
      fetchRagLibraryDocuments({
        duplicateLimit: 30,
        duplicateThreshold: 0.68,
      })
    ).resolves.toEqual({
      configured: true,
      documents: [],
      semanticDuplicateGroups: [],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/library-rag/documents?duplicateLimit=30&duplicateThreshold=0.68",
      { method: "GET" }
    );
  });

  it("deletes a DB document", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          documentId: "doc-1",
        })
      )
    );

    await expect(deleteRagLibraryDocument("doc-1")).resolves.toBe("doc-1");
    expect(fetchMock).toHaveBeenCalledWith("/api/library-rag/documents", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ documentId: "doc-1" }),
    });
  });

  it("creates a compacted DB document", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          documentId: "doc-compact",
          title: "統合: A / B",
          sourceDocumentCount: 2,
          sourceChunkCount: 6,
          retainedChunkCount: 4,
          outputChunkCount: 3,
        })
      )
    );

    await expect(
      compactRagLibraryDocuments({
        documentIds: ["doc-1", "doc-2"],
        title: "統合: A / B",
      })
    ).resolves.toEqual({
      documentId: "doc-compact",
      title: "統合: A / B",
      sourceDocumentCount: 2,
      sourceChunkCount: 6,
      retainedChunkCount: 4,
      outputChunkCount: 3,
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/library-rag/documents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        documentIds: ["doc-1", "doc-2"],
        title: "統合: A / B",
      }),
    });
  });
});
