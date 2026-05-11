import { chunkRagLibraryDocument } from "@/lib/app/reference-library/ragLibraryChunking";
import {
  buildTextVector,
  cosineSimilarity,
} from "@/lib/app/reference-library/ragLibraryDuplicateDetection";
import { hashRagContent } from "@/lib/app/reference-library/ragLibraryIndexing";
import type {
  RagLibraryDocument,
  RagLibraryStoredChunk,
  RagLibraryStoredDocument,
} from "@/lib/app/reference-library/ragLibraryTypes";
import { createOpenAIEmbeddingWithUsage } from "@/lib/server/rag/openaiEmbedding";
import {
  hasSupabaseRagConfig,
  listSupabaseRagLibraryDocumentsByIds,
  replaceSupabaseRagLibraryChunks,
  upsertSupabaseRagLibraryDocument,
} from "@/lib/server/rag/supabaseRagClient";
import type { TokenUsage } from "@/lib/app/gpt-memory/gptMemoryStateHelpers";
import { addUsage, emptyUsage } from "@/lib/shared/tokenStats";

export type LibraryRagCompactionResult = {
  compacted: boolean;
  documentId?: string;
  libraryItemId?: string;
  title?: string;
  sourceDocumentCount: number;
  sourceChunkCount: number;
  retainedChunkCount: number;
  outputChunkCount: number;
  usage?: TokenUsage;
  skippedReason?: string;
};

export async function compactSupabaseRagLibraryDocuments(params: {
  documentIds: string[];
  title?: string;
  similarityThreshold?: number;
}): Promise<LibraryRagCompactionResult> {
  if (!hasSupabaseRagConfig()) {
    return buildSkippedResult("supabase_not_configured", params.documentIds);
  }

  const documents = await listSupabaseRagLibraryDocumentsByIds(params.documentIds);
  if (documents.length < 2) {
    return buildSkippedResult("not_enough_documents", params.documentIds);
  }

  const sourceChunks = documents.flatMap((document) => document.chunks);
  const retainedChunks = selectDistinctChunks(
    sourceChunks,
    params.similarityThreshold ?? 0.88
  );
  if (retainedChunks.length === 0) {
    return buildSkippedResult("empty_chunks", params.documentIds, documents);
  }

  const document = buildCompactedDocument({
    documents,
    chunks: retainedChunks,
    title: params.title,
  });
  const chunks = chunkRagLibraryDocument(document);
  let usage = emptyUsage();
  const chunksWithEmbeddings = [];
  for (const chunk of chunks) {
    const embeddingResult = await createOpenAIEmbeddingWithUsage(chunk.content);
    if (embeddingResult.usage) usage = addUsage(usage, embeddingResult.usage);
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
    compacted: true,
    documentId,
    libraryItemId: document.libraryItemId,
    title: document.title,
    sourceDocumentCount: documents.length,
    sourceChunkCount: sourceChunks.length,
    retainedChunkCount: retainedChunks.length,
    outputChunkCount: chunksWithEmbeddings.length,
    usage,
  };
}

function selectDistinctChunks(
  chunks: RagLibraryStoredChunk[],
  similarityThreshold: number
) {
  const retained: Array<{
    chunk: RagLibraryStoredChunk;
    vector: Map<string, number>;
  }> = [];
  chunks
    .filter((chunk) => chunk.content.trim())
    .sort((left, right) => right.tokenEstimate - left.tokenEstimate)
    .forEach((chunk) => {
      const vector = buildTextVector(chunk.content, 3);
      const alreadyCovered = retained.some(
        (entry) => cosineSimilarity(vector, entry.vector) >= similarityThreshold
      );
      if (!alreadyCovered) retained.push({ chunk, vector });
    });
  return retained
    .map((entry) => entry.chunk)
    .sort((left, right) => left.chunkIndex - right.chunkIndex);
}

function buildCompactedDocument(params: {
  documents: RagLibraryStoredDocument[];
  chunks: RagLibraryStoredChunk[];
  title?: string;
}): RagLibraryDocument {
  const title =
    params.title?.trim() ||
    `統合: ${params.documents
      .map((document) => document.title)
      .filter(Boolean)
      .slice(0, 2)
      .join(" / ")}`;
  const sourceTitles = params.documents
    .map((document) => `- ${document.title}`)
    .join("\n");
  const content = [
    `Title: ${title}`,
    "Summary: 近似文書・近似チャンクの重複を除いて統合したDB文書です。",
    "Source documents:",
    sourceTitles,
    "Merged content:",
    ...params.chunks.map(
      (chunk, index) => `## Retained chunk ${index + 1}\n${chunk.content}`
    ),
  ].join("\n\n");
  const now = new Date().toISOString();
  const sourceDocumentIds = params.documents.map((document) => document.id);
  return {
    libraryItemId: `compact:${Date.now()}:${hashRagContent(content).slice(0, 12)}`,
    sourceId: `compact:${sourceDocumentIds.join(",").slice(0, 80)}`,
    itemType: "kin_created",
    title,
    summary: "近似DB文書を統合し、重複チャンクを圧縮したDB文書です。",
    content,
    metadata: {
      documentType: "rag_compaction",
      createdAt: now,
      sourceDocumentIds,
      sourceLibraryItemIds: params.documents.map(
        (document) => document.libraryItemId
      ),
      sourceTitles: params.documents.map((document) => document.title),
    },
    contentHash: hashRagContent(content),
  };
}

function buildSkippedResult(
  skippedReason: string,
  documentIds: string[],
  documents: RagLibraryStoredDocument[] = []
): LibraryRagCompactionResult {
  return {
    compacted: false,
    skippedReason,
    sourceDocumentCount: documents.length || documentIds.length,
    sourceChunkCount: documents.reduce(
      (sum, document) => sum + document.chunks.length,
      0
    ),
    retainedChunkCount: 0,
    outputChunkCount: 0,
  };
}
