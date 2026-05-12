import type {
  RagLibraryOrganizationAnalysisResult,
  RagLibraryOrganizedDocumentResult,
} from "@/lib/app/reference-library/ragLibraryOrganizationTypes";

type LibraryRagOrganizationApiResponse = Partial<
  RagLibraryOrganizationAnalysisResult & RagLibraryOrganizedDocumentResult
> & {
  ok?: boolean;
  error?: string;
};

export async function analyzeRagLibraryOrganization(): Promise<RagLibraryOrganizationAnalysisResult> {
  const response = await fetch("/api/library-rag/organize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "analyze" }),
  });
  const data = (await response.json().catch(() => ({}))) as LibraryRagOrganizationApiResponse;
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || response.statusText || "DB organization analysis failed.");
  }
  return {
    configured: data.configured !== false,
    documentsScanned: data.documentsScanned || 0,
    chunksScanned: data.chunksScanned || 0,
    sourceTokenEstimate: data.sourceTokenEstimate || 0,
    groups: Array.isArray(data.groups) ? data.groups : [],
    usage: data.usage,
  };
}

export async function createOrganizedRagLibraryDocument(params: {
  documentIds: string[];
  targetTitle?: string;
  groupLabel?: string;
  deleteSourceDocuments?: boolean;
}): Promise<RagLibraryOrganizedDocumentResult> {
  const response = await fetch("/api/library-rag/organize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "create_organized_document",
      ...params,
    }),
  });
  const data = (await response.json().catch(() => ({}))) as LibraryRagOrganizationApiResponse;
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || response.statusText || "DB organization failed.");
  }
  return {
    documentId: data.documentId || "",
    title: data.title || "",
    sourceDocumentCount: data.sourceDocumentCount || 0,
    sourceChunkCount: data.sourceChunkCount || 0,
    sourceTokenEstimate: data.sourceTokenEstimate || 0,
    outputChunkCount: data.outputChunkCount || 0,
    outputTokenEstimate: data.outputTokenEstimate || 0,
    deletedSourceDocumentCount: data.deletedSourceDocumentCount || 0,
    usage: data.usage,
  };
}
