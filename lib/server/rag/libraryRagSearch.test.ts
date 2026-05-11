import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createOpenAIEmbeddingWithUsage,
  matchSupabaseRagLibraryChunks,
  hasSupabaseRagConfig,
} =
  vi.hoisted(() => ({
    createOpenAIEmbeddingWithUsage: vi.fn(),
    matchSupabaseRagLibraryChunks: vi.fn(),
    hasSupabaseRagConfig: vi.fn(),
  }));

vi.mock("@/lib/server/rag/openaiEmbedding", () => ({
  createOpenAIEmbeddingWithUsage,
}));

vi.mock("@/lib/server/rag/supabaseRagClient", () => ({
  hasSupabaseRagConfig,
  matchSupabaseRagLibraryChunks,
}));

import { searchLibraryRagContext } from "@/lib/server/rag/libraryRagSearch";

describe("searchLibraryRagContext", () => {
  beforeEach(() => {
    createOpenAIEmbeddingWithUsage.mockReset();
    matchSupabaseRagLibraryChunks.mockReset();
    hasSupabaseRagConfig.mockReset();
  });

  it("skips empty queries without calling external services", async () => {
    const result = await searchLibraryRagContext({ query: "   " });

    expect(result).toEqual({
      context: "",
      matches: [],
      skippedReason: "empty_query",
    });
    expect(createOpenAIEmbeddingWithUsage).not.toHaveBeenCalled();
    expect(matchSupabaseRagLibraryChunks).not.toHaveBeenCalled();
  });

  it("skips when Supabase RAG is not configured", async () => {
    hasSupabaseRagConfig.mockReturnValue(false);

    const result = await searchLibraryRagContext({ query: "cotton outlook" });

    expect(result).toEqual({
      context: "",
      matches: [],
      skippedReason: "supabase_not_configured",
    });
    expect(createOpenAIEmbeddingWithUsage).not.toHaveBeenCalled();
  });

  it("embeds the query, searches Supabase, and formats RAG context", async () => {
    hasSupabaseRagConfig.mockReturnValue(true);
    createOpenAIEmbeddingWithUsage.mockResolvedValue({
      embedding: [0.1, 0.2, 0.3],
      usage: { inputTokens: 3, outputTokens: 0, totalTokens: 3 },
    });
    matchSupabaseRagLibraryChunks.mockResolvedValue([
      {
        chunkId: "chunk-1",
        documentId: "doc-1",
        libraryItemId: "lib-1",
        title: "Cotton report",
        itemType: "ingested_file",
        chunkIndex: 2,
        content: "Cotton prices moved higher.",
        similarity: 0.91,
      },
    ]);

    const result = await searchLibraryRagContext({
      query: "cotton price",
      matchCount: 4,
    });

    expect(createOpenAIEmbeddingWithUsage).toHaveBeenCalledWith("cotton price");
    expect(matchSupabaseRagLibraryChunks).toHaveBeenCalledWith({
      embedding: [0.1, 0.2, 0.3],
      matchCount: 100,
      matchThreshold: 0.3,
      filterMetadata: undefined,
    });
    expect(result.context).toContain("<<RAG_LIBRARY_CONTEXT>>");
    expect(result.context).toContain("Cotton prices moved higher.");
    expect(result.matches).toHaveLength(1);
    expect(result.usage).toEqual({ inputTokens: 3, outputTokens: 0, totalTokens: 3 });
  });

  it("treats the RAG reference count as a context chunk limit", async () => {
    hasSupabaseRagConfig.mockReturnValue(true);
    createOpenAIEmbeddingWithUsage.mockResolvedValue({
      embedding: [0.1, 0.2, 0.3],
      usage: { inputTokens: 3, outputTokens: 0, totalTokens: 3 },
    });
    matchSupabaseRagLibraryChunks.mockResolvedValue([
      buildMatch("lib-1", 0),
      buildMatch("lib-1", 1),
      buildMatch("lib-1", 2),
      buildMatch("lib-2", 0),
      buildMatch("lib-3", 0),
    ]);

    const result = await searchLibraryRagContext({
      query: "cotton price",
      matchCount: 2,
    });

    expect(result.matches.map((match) => match.libraryItemId)).toEqual([
      "lib-1",
      "lib-1",
    ]);
    expect(result.matches).toHaveLength(2);
  });

  it("caps the context chunk limit separately from the candidate count", async () => {
    hasSupabaseRagConfig.mockReturnValue(true);
    createOpenAIEmbeddingWithUsage.mockResolvedValue({
      embedding: [0.1, 0.2, 0.3],
      usage: { inputTokens: 3, outputTokens: 0, totalTokens: 3 },
    });
    matchSupabaseRagLibraryChunks.mockResolvedValue([]);

    await searchLibraryRagContext({
      query: "farmers 360 link",
      matchCount: 999,
    });

    expect(matchSupabaseRagLibraryChunks).toHaveBeenCalledWith({
      embedding: [0.1, 0.2, 0.3],
      matchCount: 100,
      matchThreshold: 0.3,
      filterMetadata: undefined,
    });
  });

  it("uses the explicit candidate count and similarity threshold for Supabase search", async () => {
    hasSupabaseRagConfig.mockReturnValue(true);
    createOpenAIEmbeddingWithUsage.mockResolvedValue({
      embedding: [0.1, 0.2, 0.3],
      usage: { inputTokens: 3, outputTokens: 0, totalTokens: 3 },
    });
    matchSupabaseRagLibraryChunks.mockResolvedValue([
      buildMatch("lib-1", 0),
      buildMatch("lib-1", 1),
      buildMatch("lib-1", 2),
    ]);

    const result = await searchLibraryRagContext({
      query: "school recommendation",
      candidateCount: 100,
      matchCount: 10,
      matchThreshold: 0.42,
    });

    expect(matchSupabaseRagLibraryChunks).toHaveBeenCalledWith({
      embedding: [0.1, 0.2, 0.3],
      matchCount: 100,
      matchThreshold: 0.42,
      filterMetadata: undefined,
    });
    expect(result.matches).toHaveLength(3);
  });
});

function buildMatch(libraryItemId: string, chunkIndex: number) {
  return {
    chunkId: `${libraryItemId}-${chunkIndex}`,
    documentId: `doc-${libraryItemId}`,
    libraryItemId,
    title: `Card ${libraryItemId}`,
    itemType: "ingested_file",
    chunkIndex,
    content: `Chunk ${chunkIndex} from ${libraryItemId}.`,
    similarity: 0.9,
  };
}
