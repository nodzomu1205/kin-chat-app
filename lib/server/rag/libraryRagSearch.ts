import { buildRagLibraryReferenceContext } from "@/lib/app/reference-library/ragLibraryContext";
import type { RagLibrarySearchMatch } from "@/lib/app/reference-library/ragLibraryTypes";
import { createOpenAIEmbeddingWithUsage } from "@/lib/server/rag/openaiEmbedding";
import type { TokenUsage } from "@/lib/app/gpt-memory/gptMemoryStateHelpers";
import {
  hasSupabaseRagConfig,
  matchSupabaseRagLibraryChunks,
} from "@/lib/server/rag/supabaseRagClient";

export type LibraryRagSearchResult = {
  context: string;
  matches: RagLibrarySearchMatch[];
  usage?: TokenUsage;
  skippedReason?: string;
};

export async function searchLibraryRagContext(params: {
  query: string;
  matchCount?: number;
  candidateCount?: number;
  matchThreshold?: number;
  filterMetadata?: Record<string, unknown>;
}): Promise<LibraryRagSearchResult> {
  const query = params.query.trim();
  const rawCardLimit =
    typeof params.matchCount === "number" && Number.isFinite(params.matchCount)
      ? params.matchCount
      : 10;
  const contextChunkLimit = Math.min(50, Math.max(1, Math.floor(rawCardLimit || 10)));
  const rawCandidateCount =
    typeof params.candidateCount === "number" &&
    Number.isFinite(params.candidateCount)
    ? params.candidateCount
    : 100;
  const candidateCount = Math.min(
    500,
    Math.max(contextChunkLimit, Math.floor(rawCandidateCount || 100))
  );
  if (!query) {
    return { context: "", matches: [], skippedReason: "empty_query" };
  }

  if (!hasSupabaseRagConfig()) {
    return { context: "", matches: [], skippedReason: "supabase_not_configured" };
  }

  const embeddingResult = await createOpenAIEmbeddingWithUsage(query);
  const matches = await matchSupabaseRagLibraryChunks({
    embedding: embeddingResult.embedding,
    matchCount: candidateCount,
    matchThreshold: params.matchThreshold ?? 0.3,
    filterMetadata: params.filterMetadata,
  });
  const contextMatches = matches.slice(0, contextChunkLimit);

  return {
    context: buildRagLibraryReferenceContext({
      matches: contextMatches,
    }),
    matches: contextMatches,
    usage: embeddingResult.usage,
  };
}
