import type { RagLibrarySearchMatch } from "@/lib/app/reference-library/ragLibraryTypes";

export const RAG_LIBRARY_REFERENCE_LOG_KEY = "rag_library_reference_logs";

export type RagLibraryReferenceLogEntry = {
  id: string;
  createdAt: string;
  usageBucket: "chat" | "task";
  originalQuery?: string;
  query: string;
  contextChars: number;
  skippedReason?: string;
  matches: Array<{
    chunkId?: string;
    documentId?: string;
    libraryItemId: string;
    title: string;
    chunkIndex: number;
    similarity?: number;
    contentPreview: string;
  }>;
};

export function appendRagLibraryReferenceLog(entry: {
  usageBucket: "chat" | "task";
  originalQuery?: string;
  query: string;
  context: string;
  matches: RagLibrarySearchMatch[];
  skippedReason?: string;
}) {
  if (typeof window === "undefined") return;
  const nextEntry: RagLibraryReferenceLogEntry = {
    id: `db-ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    usageBucket: entry.usageBucket,
    originalQuery: entry.originalQuery?.trim() || undefined,
    query: entry.query,
    contextChars: entry.context.trim().length,
    skippedReason: entry.skippedReason,
    matches: entry.matches.map((match) => ({
      chunkId: match.chunkId,
      documentId: match.documentId,
      libraryItemId: match.libraryItemId,
      title: match.title,
      chunkIndex: match.chunkIndex,
      similarity: match.similarity,
      contentPreview: match.content.replace(/\s+/g, " ").trim().slice(0, 180),
    })),
  };

  const logs = readRagLibraryReferenceLogs();
  const next = [nextEntry, ...logs].slice(0, 50);
  window.localStorage.setItem(RAG_LIBRARY_REFERENCE_LOG_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("rag-library-reference-log-updated"));
}

export function readRagLibraryReferenceLogs(): RagLibraryReferenceLogEntry[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(RAG_LIBRARY_REFERENCE_LOG_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as RagLibraryReferenceLogEntry[];
    return Array.isArray(parsed) ? parsed.filter(isReferenceLogEntry) : [];
  } catch {
    return [];
  }
}

function isReferenceLogEntry(value: unknown): value is RagLibraryReferenceLogEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<RagLibraryReferenceLogEntry>;
  return (
    typeof entry.id === "string" &&
    typeof entry.createdAt === "string" &&
    typeof entry.query === "string" &&
    Array.isArray(entry.matches)
  );
}
