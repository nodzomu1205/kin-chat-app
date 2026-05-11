export const RAG_LIBRARY_DB_DOCUMENT_ORDER_KEY = "rag_library_db_document_order";
export const RAG_LIBRARY_DB_CANDIDATE_DOCUMENT_IDS_KEY =
  "rag_library_db_candidate_document_ids";

export function readRagLibraryDbDocumentOrder() {
  return readStringArrayFromLocalStorage(RAG_LIBRARY_DB_DOCUMENT_ORDER_KEY);
}

export function writeRagLibraryDbDocumentOrder(order: string[]) {
  writeStringArrayToLocalStorage(RAG_LIBRARY_DB_DOCUMENT_ORDER_KEY, order);
}

export function readRagLibraryCandidateDocumentIds() {
  return readStringArrayFromLocalStorage(RAG_LIBRARY_DB_CANDIDATE_DOCUMENT_IDS_KEY);
}

export function writeRagLibraryCandidateDocumentIds(documentIds: string[]) {
  writeStringArrayToLocalStorage(
    RAG_LIBRARY_DB_CANDIDATE_DOCUMENT_IDS_KEY,
    documentIds
  );
}

function readStringArrayFromLocalStorage(key: string) {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function writeStringArrayToLocalStorage(key: string, values: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(values));
}
