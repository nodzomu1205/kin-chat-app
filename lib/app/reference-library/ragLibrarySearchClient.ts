import { buildRagLibraryReferenceContext } from "@/lib/app/reference-library/ragLibraryContext";
import type { TokenUsage } from "@/lib/app/gpt-memory/gptMemoryStateHelpers";
import type { RagLibrarySearchMatch } from "@/lib/app/reference-library/ragLibraryTypes";

type LibraryRagSearchApiResponse = {
  ok?: boolean;
  context?: string;
  matches?: RagLibrarySearchMatch[];
  usage?: TokenUsage;
  skippedReason?: string;
  error?: string;
};

export type RagLibraryReferenceContextResult = {
  context: string;
  usage?: TokenUsage;
  matches: RagLibrarySearchMatch[];
  skippedReason?: string;
};

export async function fetchRagLibraryReferenceContext(params: {
  query: string;
  matchCount: number;
  candidateCount?: number;
  matchThreshold?: number;
}): Promise<RagLibraryReferenceContextResult> {
  const query = params.query.trim();
  const rawMatchCount = Number.isFinite(params.matchCount) ? params.matchCount : 8;
  const matchCount = Math.min(50, Math.max(1, Math.floor(rawMatchCount)));
  const rawCandidateCount =
    typeof params.candidateCount === "number" &&
    Number.isFinite(params.candidateCount)
    ? params.candidateCount
    : 100;
  const candidateCount = Math.min(500, Math.max(matchCount, Math.floor(rawCandidateCount)));
  if (!query) return { context: "", matches: [], skippedReason: "empty_query" };

  try {
    const response = await fetch("/api/library-rag/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        matchCount,
        candidateCount,
        matchThreshold: params.matchThreshold,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as LibraryRagSearchApiResponse;
    if (!response.ok || data.ok === false) {
      console.warn("Library RAG search skipped:", data.error || response.statusText);
      return { context: "", matches: [], skippedReason: data.error || response.statusText };
    }

    if (data.context?.trim()) {
      return {
        context: data.context.trim(),
        usage: data.usage,
        matches: Array.isArray(data.matches) ? data.matches : [],
        skippedReason: data.skippedReason,
      };
    }

    if (Array.isArray(data.matches) && data.matches.length > 0) {
      return {
        context: buildRagLibraryReferenceContext({
          matches: data.matches,
          maxMatches: matchCount,
        }),
        usage: data.usage,
        matches: data.matches,
        skippedReason: data.skippedReason,
      };
    }

    if (data.skippedReason) {
      console.info("Library RAG search skipped:", data.skippedReason);
    }
    return {
      context: "",
      usage: data.usage,
      matches: [],
      skippedReason: data.skippedReason,
    };
  } catch (error) {
    console.warn("Library RAG search failed:", error);
    return { context: "", matches: [] };
  }
}
