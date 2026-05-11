import type { RagLibraryStoredDocument } from "@/lib/app/reference-library/ragLibraryTypes";

type LibraryRagDocumentsApiResponse = {
  ok?: boolean;
  configured?: boolean;
  documents?: RagLibraryStoredDocument[];
  error?: string;
};

export type LibraryRagDocumentsResult = {
  configured: boolean;
  documents: RagLibraryStoredDocument[];
};

export async function fetchRagLibraryDocuments(params: {
  limit?: number;
} = {}): Promise<LibraryRagDocumentsResult> {
  const search = new URLSearchParams();
  if (params.limit) {
    search.set("limit", String(params.limit));
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
  };
}
