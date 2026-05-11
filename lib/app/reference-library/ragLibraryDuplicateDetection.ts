import type { RagLibraryStoredDocument } from "@/lib/app/reference-library/ragLibraryTypes";

export type RagLibraryDuplicateGroupReason =
  | "same_content_hash"
  | "same_chunk_text"
  | "similar_document"
  | "similar_chunk";

export type RagLibraryDuplicateGroup = {
  id: string;
  reason: RagLibraryDuplicateGroupReason;
  documentIds: string[];
  chunkIds: string[];
  titles: string[];
  documentCount: number;
  chunkCount: number;
  totalTokenEstimate: number;
  similarity?: number;
};

export function buildRagLibraryDuplicateGroups(
  documents: RagLibraryStoredDocument[]
): RagLibraryDuplicateGroup[] {
  return [
    ...buildDocumentHashGroups(documents),
    ...buildChunkTextGroups(documents),
  ].sort((left, right) => {
    const reasonDelta =
      duplicateReasonPriority(left.reason) - duplicateReasonPriority(right.reason);
    if (reasonDelta !== 0) return reasonDelta;
    const similarityDelta = (right.similarity ?? 0) - (left.similarity ?? 0);
    if (similarityDelta !== 0) return similarityDelta;
    const tokenDelta = right.totalTokenEstimate - left.totalTokenEstimate;
    if (tokenDelta !== 0) return tokenDelta;
    return right.chunkCount - left.chunkCount;
  });
}

function buildDocumentHashGroups(
  documents: RagLibraryStoredDocument[]
): RagLibraryDuplicateGroup[] {
  const byHash = new Map<string, RagLibraryStoredDocument[]>();
  documents.forEach((document) => {
    const hash = document.contentHash.trim();
    if (!hash) return;
    byHash.set(hash, [...(byHash.get(hash) || []), document]);
  });

  return Array.from(byHash.entries())
    .filter(([, group]) => group.length > 1)
    .map(([hash, group]) => {
      const chunks = group.flatMap((document) => document.chunks);
      return {
        id: `hash:${hash}`,
        reason: "same_content_hash" as const,
        documentIds: unique(group.map((document) => document.id)),
        chunkIds: unique(chunks.map((chunk) => chunk.id)),
        titles: unique(group.map((document) => document.title)).slice(0, 4),
        documentCount: group.length,
        chunkCount: chunks.length,
        totalTokenEstimate: chunks.reduce(
          (sum, chunk) => sum + chunk.tokenEstimate,
          0
        ),
      };
    });
}

function buildChunkTextGroups(
  documents: RagLibraryStoredDocument[]
): RagLibraryDuplicateGroup[] {
  const byText = new Map<
    string,
    Array<{
      document: RagLibraryStoredDocument;
      chunkId: string;
      tokenEstimate: number;
    }>
  >();

  documents.forEach((document) => {
    document.chunks.forEach((chunk) => {
      const normalized = normalizeDuplicateText(chunk.content);
      if (normalized.length < 80) return;
      byText.set(normalized, [
        ...(byText.get(normalized) || []),
        {
          document,
          chunkId: chunk.id,
          tokenEstimate: chunk.tokenEstimate,
        },
      ]);
    });
  });

  return Array.from(byText.entries())
    .filter(([, group]) => group.length > 1)
    .map(([text, group]) => ({
      id: `chunk:${stableShortFingerprint(text)}`,
      reason: "same_chunk_text" as const,
      documentIds: unique(group.map((entry) => entry.document.id)),
      chunkIds: unique(group.map((entry) => entry.chunkId)),
      titles: unique(group.map((entry) => entry.document.title)).slice(0, 4),
      documentCount: unique(group.map((entry) => entry.document.id)).length,
      chunkCount: group.length,
      totalTokenEstimate: group.reduce(
        (sum, entry) => sum + entry.tokenEstimate,
        0
      ),
    }));
}

export function normalizeDuplicateText(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\u3000]+/g, "")
    .replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^_`{|}~。、，．・：；！？（）［］｛｝「」『』【】]/g, "")
    .trim();
}

export function buildTextVector(value: string, ngramSize = 3) {
  const normalized = normalizeDuplicateText(value);
  const grams = new Map<string, number>();
  if (!normalized) return grams;
  if (normalized.length <= ngramSize) {
    grams.set(normalized, 1);
    return grams;
  }
  for (let index = 0; index <= normalized.length - ngramSize; index += 1) {
    const gram = normalized.slice(index, index + ngramSize);
    grams.set(gram, (grams.get(gram) || 0) + 1);
  }
  return grams;
}

export function cosineSimilarity(
  left: Map<string, number>,
  right: Map<string, number>
) {
  if (left.size === 0 || right.size === 0) return 0;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  left.forEach((value, key) => {
    dot += value * (right.get(key) || 0);
    leftNorm += value * value;
  });
  right.forEach((value) => {
    rightNorm += value * value;
  });
  if (!leftNorm || !rightNorm) return 0;
  return dot / Math.sqrt(leftNorm * rightNorm);
}

function duplicateReasonPriority(reason: RagLibraryDuplicateGroupReason) {
  if (reason === "same_content_hash") return 0;
  if (reason === "same_chunk_text") return 1;
  if (reason === "similar_document") return 2;
  return 3;
}

function stableShortFingerprint(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}
