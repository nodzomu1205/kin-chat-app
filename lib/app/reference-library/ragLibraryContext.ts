import type { RagLibrarySearchMatch } from "@/lib/app/reference-library/ragLibraryTypes";
import { normalizeRagText } from "@/lib/app/reference-library/ragLibraryChunking";

export function buildRagLibraryReferenceContext(params: {
  matches: RagLibrarySearchMatch[];
  maxMatches?: number;
}) {
  const matches = params.matches
    .filter((match) => normalizeRagText(match.content))
    .slice(0, Math.max(1, params.maxMatches || params.matches.length));
  if (matches.length === 0) return "";

  const lines = ["<<RAG_LIBRARY_CONTEXT>>"];
  matches.forEach((match, index) => {
    lines.push(
      `[RAG ${index + 1}]`,
      `TITLE: ${normalizeRagText(match.title) || "Untitled"}`,
      `LIBRARY_ITEM_ID: ${match.libraryItemId}`,
      `CHUNK_INDEX: ${match.chunkIndex}`
    );
    if (typeof match.similarity === "number") {
      lines.push(`SIMILARITY: ${match.similarity.toFixed(4)}`);
    }
    lines.push("CONTENT:", normalizeRagText(match.content), "");
  });
  lines.push("<<END_RAG_LIBRARY_CONTEXT>>");
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
