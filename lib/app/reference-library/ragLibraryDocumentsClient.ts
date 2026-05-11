import type { RagLibraryStoredDocument } from "@/lib/app/reference-library/ragLibraryTypes";
import type { RagLibraryDuplicateGroup } from "@/lib/app/reference-library/ragLibraryDuplicateDetection";

type LibraryRagDocumentsApiResponse = {
  ok?: boolean;
  configured?: boolean;
  documents?: RagLibraryStoredDocument[];
  semanticDuplicateGroups?: RagLibraryDuplicateGroup[];
  documentId?: string;
  title?: string;
  sourceDocumentCount?: number;
  sourceChunkCount?: number;
  retainedChunkCount?: number;
  outputChunkCount?: number;
  error?: string;
};

export type LibraryRagDocumentsResult = {
  configured: boolean;
  documents: RagLibraryStoredDocument[];
  semanticDuplicateGroups: RagLibraryDuplicateGroup[];
};

export async function fetchRagLibraryDocuments(params: {
  limit?: number;
  duplicateLimit?: number;
  duplicateThreshold?: number;
} = {}): Promise<LibraryRagDocumentsResult> {
  const search = new URLSearchParams();
  if (params.limit) {
    search.set("limit", String(params.limit));
  }
  if (params.duplicateLimit) {
    search.set("duplicateLimit", String(params.duplicateLimit));
  }
  if (typeof params.duplicateThreshold === "number") {
    search.set("duplicateThreshold", String(params.duplicateThreshold));
  }
  const response = await fetch(
    `/api/library-rag/documents${search.size ? `?${search}` : ""}`,
    { method: "GET" }
  );
  const data = (await response.json().catch(() => ({}))) as LibraryRagDocumentsApiResponse;
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || response.statusText || "DB items failed to load.");
  }

  return {
    configured: data.configured !== false,
    documents: Array.isArray(data.documents) ? data.documents : [],
    semanticDuplicateGroups: Array.isArray(data.semanticDuplicateGroups)
      ? data.semanticDuplicateGroups
      : [],
  };
}

export async function deleteRagLibraryDocument(documentId: string) {
  const response = await fetch("/api/library-rag/documents", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ documentId }),
  });
  const data = (await response.json().catch(() => ({}))) as LibraryRagDocumentsApiResponse;
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || response.statusText || "DB item delete failed.");
  }
  return data.documentId || documentId;
}

export async function compactRagLibraryDocuments(params: {
  documentIds: string[];
  title?: string;
  similarityThreshold?: number;
}) {
  const response = await fetch("/api/library-rag/documents", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });
  const data = (await response.json().catch(() => ({}))) as LibraryRagDocumentsApiResponse;
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || response.statusText || "DB compaction failed.");
  }
  return {
    documentId: data.documentId || "",
    title: data.title || "",
    sourceDocumentCount: data.sourceDocumentCount || 0,
    sourceChunkCount: data.sourceChunkCount || 0,
    retainedChunkCount: data.retainedChunkCount || 0,
    outputChunkCount: data.outputChunkCount || 0,
  };
}
