import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReferenceLibraryItem } from "@/types/chat";

const {
  createOpenAIEmbeddingWithUsage,
  hasSupabaseRagConfig,
  replaceSupabaseRagLibraryChunks,
  upsertSupabaseRagLibraryDocument,
} = vi.hoisted(() => ({
  createOpenAIEmbeddingWithUsage: vi.fn(),
  hasSupabaseRagConfig: vi.fn(),
  replaceSupabaseRagLibraryChunks: vi.fn(),
  upsertSupabaseRagLibraryDocument: vi.fn(),
}));

vi.mock("@/lib/server/rag/openaiEmbedding", () => ({
  createOpenAIEmbeddingWithUsage,
}));

vi.mock("@/lib/server/rag/supabaseRagClient", () => ({
  hasSupabaseRagConfig,
  replaceSupabaseRagLibraryChunks,
  upsertSupabaseRagLibraryDocument,
}));

import { indexReferenceLibraryItemForRag } from "@/lib/server/rag/libraryRagIndexing";

describe("indexReferenceLibraryItemForRag", () => {
  beforeEach(() => {
    createOpenAIEmbeddingWithUsage.mockReset();
    hasSupabaseRagConfig.mockReset();
    replaceSupabaseRagLibraryChunks.mockReset();
    upsertSupabaseRagLibraryDocument.mockReset();
  });

  it("skips when Supabase is not configured", async () => {
    hasSupabaseRagConfig.mockReturnValue(false);

    const result = await indexReferenceLibraryItemForRag({
      item: buildItem({ summary: "A useful memo." }),
    });

    expect(result).toEqual({
      indexed: false,
      chunkCount: 0,
      skippedReason: "supabase_not_configured",
    });
    expect(createOpenAIEmbeddingWithUsage).not.toHaveBeenCalled();
  });

  it("builds chunks, embeds them, and replaces Supabase chunks", async () => {
    hasSupabaseRagConfig.mockReturnValue(true);
    createOpenAIEmbeddingWithUsage.mockResolvedValue({
      embedding: [0.1, 0.2, 0.3],
      usage: { inputTokens: 7, outputTokens: 0, totalTokens: 7 },
    });
    upsertSupabaseRagLibraryDocument.mockResolvedValue("doc-1");

    const result = await indexReferenceLibraryItemForRag({
      item: buildItem({
        summary: "Market summary.",
        excerptText: "Longer report body with concrete facts.",
      }),
    });

    expect(upsertSupabaseRagLibraryDocument).toHaveBeenCalledOnce();
    expect(createOpenAIEmbeddingWithUsage).toHaveBeenCalled();
    expect(replaceSupabaseRagLibraryChunks).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: "doc-1",
        chunks: expect.arrayContaining([
          expect.objectContaining({
            libraryItemId: "lib-1",
            embedding: [0.1, 0.2, 0.3],
          }),
        ]),
      })
    );
    expect(result).toMatchObject({
      indexed: true,
      documentId: "doc-1",
      libraryItemId: "lib-1",
      usage: { inputTokens: 7, outputTokens: 0, totalTokens: 7 },
    });
    expect(result.chunkCount).toBeGreaterThan(0);
  });
});

function buildItem(
  patch: Partial<ReferenceLibraryItem> = {}
): ReferenceLibraryItem {
  return {
    id: "lib-1",
    sourceId: "source-1",
    itemType: "ingested_file",
    artifactType: "reference_note",
    title: "Cotton memo",
    subtitle: "",
    summary: "",
    excerptText: "",
    sources: [],
    createdAt: "2026-05-10T00:00:00.000Z",
    updatedAt: "2026-05-10T00:00:00.000Z",
    ...patch,
  };
}
