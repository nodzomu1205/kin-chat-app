import type { ReferenceLibraryItem } from "@/types/chat";
import { chunkRagLibraryDocument } from "@/lib/app/reference-library/ragLibraryChunking";
import { buildRagLibraryDocument } from "@/lib/app/reference-library/ragLibraryIndexing";
import { createOpenAIEmbeddingWithUsage } from "@/lib/server/rag/openaiEmbedding";
import { addUsage, emptyUsage } from "@/lib/shared/tokenStats";
import type { TokenUsage } from "@/lib/app/gpt-memory/gptMemoryStateHelpers";
import {
  hasSupabaseRagConfig,
  replaceSupabaseRagLibraryChunks,
  upsertSupabaseRagLibraryDocument,
} from "@/lib/server/rag/supabaseRagClient";

export type LibraryRagIndexResult = {
  indexed: boolean;
  documentId?: string;
  libraryItemId?: string;
  chunkCount: number;
  usage?: TokenUsage;
  skippedReason?: string;
};

export async function indexReferenceLibraryItemForRag(params: {
  item: ReferenceLibraryItem;
}): Promise<LibraryRagIndexResult> {
  if (!hasSupabaseRagConfig()) {
    return { indexed: false, chunkCount: 0, skippedReason: "supabase_not_configured" };
  }

  const document = buildRagLibraryDocument(params.item);
  if (!document) {
    return { indexed: false, chunkCount: 0, skippedReason: "empty_document" };
  }

  const chunks = chunkRagLibraryDocument(document);
  const chunksWithEmbeddings = [];
  let usage = emptyUsage();
  for (const chunk of chunks) {
    const embeddingResult = await createOpenAIEmbeddingWithUsage(chunk.content);
    if (embeddingResult.usage) {
      usage = addUsage(usage, embeddingResult.usage);
    }
    chunksWithEmbeddings.push({
      ...chunk,
      embedding: embeddingResult.embedding,
    });
  }

  const documentId = await upsertSupabaseRagLibraryDocument(document);
  await replaceSupabaseRagLibraryChunks({
    documentId,
    chunks: chunksWithEmbeddings,
  });

  return {
    indexed: true,
    documentId,
    libraryItemId: document.libraryItemId,
    chunkCount: chunksWithEmbeddings.length,
    usage,
  };
}
