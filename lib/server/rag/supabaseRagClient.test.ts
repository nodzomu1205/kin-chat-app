import { afterEach, describe, expect, it, vi } from "vitest";
import { listSupabaseRagLibraryDocuments } from "@/lib/server/rag/supabaseRagClient";

const originalEnv = { ...process.env };

function buildChunk(index: number) {
  return {
    id: `chunk-${index}`,
    document_id: "doc-1",
    chunk_index: index,
    content: `Chunk ${index}`,
    token_estimate: 10,
    metadata: {},
    created_at: "2026-05-21T00:00:00.000Z",
    updated_at: "2026-05-21T00:00:00.000Z",
  };
}

describe("supabaseRagClient", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("paginates DB document chunks beyond the Supabase default 1000 row response", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.SUPABASE_RAG_SCHEMA = "public";

    const firstChunkPage = Array.from({ length: 1000 }, (_, index) =>
      buildChunk(index)
    );
    const secondChunkPage = [buildChunk(1000)];
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      async (input) => {
        const url = String(input);
        if (url.includes("/rest/v1/rag_documents")) {
          return new Response(
            JSON.stringify([
              {
                id: "doc-1",
                library_item_id: "library-1",
                source_id: "source-1",
                item_type: "ingested_file",
                artifact_type: "reference_note",
                title: "Large document",
                summary: "",
                metadata: {},
                content_hash: "hash-1",
                created_at: "2026-05-21T00:00:00.000Z",
                updated_at: "2026-05-21T00:00:00.000Z",
              },
            ])
          );
        }
        if (url.includes("offset=1000")) {
          return new Response(JSON.stringify(secondChunkPage));
        }
        if (url.includes("/rest/v1/rag_document_chunks")) {
          return new Response(JSON.stringify(firstChunkPage));
        }
        return new Response(JSON.stringify({ message: "unexpected url" }), {
          status: 500,
        });
      }
    );

    const documents = await listSupabaseRagLibraryDocuments({ limit: 1 });

    expect(documents).toHaveLength(1);
    expect(documents[0].chunks).toHaveLength(1001);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("&limit=1000"),
      expect.objectContaining({ method: "GET" })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("&offset=1000"),
      expect.objectContaining({ method: "GET" })
    );
  });
});
