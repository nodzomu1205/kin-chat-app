import type {
  RagLibraryDuplicateGroup,
} from "@/lib/app/reference-library/ragLibraryDuplicateDetection";
import type {
  RagLibraryChunk,
  RagLibraryDocument,
  RagLibrarySearchMatch,
  RagLibraryStoredChunk,
  RagLibraryStoredDocument,
} from "@/lib/app/reference-library/ragLibraryTypes";

type SupabaseRagMatchRow = {
  chunk_id?: string;
  document_id?: string;
  library_item_id?: string;
  source_id?: string;
  title?: string;
  item_type?: string;
  artifact_type?: string | null;
  chunk_index?: number;
  content?: string;
  similarity?: number;
  document_metadata?: Record<string, unknown> | null;
  chunk_metadata?: Record<string, unknown> | null;
};

type SupabaseRagDocumentRow = {
  id?: string;
  library_item_id?: string;
  source_id?: string;
  item_type?: string;
  artifact_type?: string | null;
  title?: string;
  summary?: string;
  metadata?: Record<string, unknown> | null;
  content_hash?: string;
  created_at?: string;
  updated_at?: string;
};

type SupabaseRagChunkRow = {
  id?: string;
  document_id?: string;
  chunk_index?: number;
  content?: string;
  token_estimate?: number;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
};

type SupabaseRagSimilarChunkRow = {
  left_chunk_id?: string;
  left_document_id?: string;
  left_title?: string;
  left_chunk_index?: number;
  left_token_estimate?: number;
  right_chunk_id?: string;
  right_document_id?: string;
  right_title?: string;
  right_chunk_index?: number;
  right_token_estimate?: number;
  similarity?: number;
};

function getSupabaseRagConfig() {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set.");
  }
  return {
    url: url.replace(/\/+$/, ""),
    serviceRoleKey,
    schema: process.env.SUPABASE_RAG_SCHEMA?.trim() || "public",
  };
}

export function hasSupabaseRagConfig() {
  return Boolean(
    process.env.SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

export async function listSupabaseRagLibraryDocuments(params: {
  limit?: number;
  offset?: number;
} = {}): Promise<RagLibraryStoredDocument[]> {
  const config = getSupabaseRagConfig();
  const limit = Math.min(100, Math.max(1, Math.floor(params.limit || 50)));
  const offset = Math.max(0, Math.floor(params.offset || 0));
  const documentEndpoint = [
    `${config.url}/rest/v1/rag_documents`,
    "?select=id,library_item_id,source_id,item_type,artifact_type,title,summary,metadata,content_hash,created_at,updated_at",
    "&order=updated_at.desc",
    `&limit=${limit}`,
    offset ? `&offset=${offset}` : "",
  ].join("");
  const documentResponse = await fetch(documentEndpoint, {
    method: "GET",
    headers: buildSupabaseHeaders(config),
  });
  const documentRawText = await documentResponse.text();
  const documentData = parseSupabaseResponse(documentRawText);
  if (!documentResponse.ok) {
    throw new Error(resolveSupabaseErrorMessage(documentData, documentResponse));
  }
  if (!Array.isArray(documentData) || documentData.length === 0) {
    return [];
  }

  const documents = documentData
    .map(toRagLibraryStoredDocument)
    .filter((document): document is RagLibraryStoredDocument => Boolean(document));
  if (documents.length === 0) return [];

  const chunksByDocumentId = await listSupabaseRagLibraryChunksByDocumentIds(
    config,
    documents.map((document) => document.id)
  );
  return documents.map((document) => ({
    ...document,
    chunks: chunksByDocumentId.get(document.id) || [],
  }));
}

export async function listAllSupabaseRagLibraryDocuments(): Promise<
  RagLibraryStoredDocument[]
> {
  const pageSize = 100;
  const documents: RagLibraryStoredDocument[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await listSupabaseRagLibraryDocuments({
      limit: pageSize,
      offset,
    });
    documents.push(...page);
    if (page.length < pageSize) break;
  }
  return documents;
}

export async function listSupabaseRagLibraryDocumentsByIds(
  documentIds: string[]
): Promise<RagLibraryStoredDocument[]> {
  const config = getSupabaseRagConfig();
  const ids = documentIds.map((id) => id.trim()).filter(Boolean);
  if (ids.length === 0) return [];
  const documentEndpoint = [
    `${config.url}/rest/v1/rag_documents`,
    "?select=id,library_item_id,source_id,item_type,artifact_type,title,summary,metadata,content_hash,created_at,updated_at",
    `&id=in.(${ids.map(encodeURIComponent).join(",")})`,
  ].join("");
  const documentResponse = await fetch(documentEndpoint, {
    method: "GET",
    headers: buildSupabaseHeaders(config),
  });
  const documentRawText = await documentResponse.text();
  const documentData = parseSupabaseResponse(documentRawText);
  if (!documentResponse.ok) {
    throw new Error(resolveSupabaseErrorMessage(documentData, documentResponse));
  }
  if (!Array.isArray(documentData) || documentData.length === 0) {
    return [];
  }

  const documents = documentData
    .map(toRagLibraryStoredDocument)
    .filter((document): document is RagLibraryStoredDocument => Boolean(document));
  const chunksByDocumentId = await listSupabaseRagLibraryChunksByDocumentIds(
    config,
    documents.map((document) => document.id)
  );
  const orderIndex = new Map(ids.map((id, index) => [id, index]));
  return documents
    .map((document) => ({
      ...document,
      chunks: chunksByDocumentId.get(document.id) || [],
    }))
    .sort(
      (left, right) =>
        (orderIndex.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
        (orderIndex.get(right.id) ?? Number.MAX_SAFE_INTEGER)
    );
}

export async function matchSupabaseRagLibraryChunks(params: {
  embedding: number[];
  matchCount: number;
  matchThreshold?: number;
  documentIds?: string[];
  filterMetadata?: Record<string, unknown>;
}): Promise<RagLibrarySearchMatch[]> {
  const config = getSupabaseRagConfig();
  const endpoint = `${config.url}/rest/v1/rpc/match_rag_library_chunks`;
  const body = {
    query_embedding: params.embedding,
    match_count: Math.max(1, Math.floor(params.matchCount)),
    match_threshold: params.matchThreshold ?? 0,
    filter_metadata: params.filterMetadata ?? {},
    document_ids: params.documentIds?.length ? params.documentIds : null,
  };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Profile": config.schema,
      "Content-Profile": config.schema,
    },
    body: JSON.stringify(body),
  });

  const rawText = await response.text();
  const data = parseSupabaseResponse(rawText);

  if (!response.ok && body.document_ids?.length && isMissingDocumentIdsRpc(data)) {
    return matchSupabaseRagLibraryChunks({
      embedding: params.embedding,
      matchCount: params.matchCount,
      matchThreshold: params.matchThreshold,
      filterMetadata: params.filterMetadata,
    });
  }

  if (!response.ok) {
    throw new Error(resolveSupabaseErrorMessage(data, response));
  }

  if (!Array.isArray(data)) return [];
  return data
    .map(toRagLibrarySearchMatch)
    .filter((match): match is RagLibrarySearchMatch => Boolean(match));
}

export async function listSupabaseRagSemanticDuplicateGroups(params: {
  minSimilarity?: number;
  maxPairs?: number;
} = {}): Promise<RagLibraryDuplicateGroup[]> {
  const config = getSupabaseRagConfig();
  const endpoint = `${config.url}/rest/v1/rpc/find_similar_rag_library_chunks`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...buildSupabaseHeaders(config),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      min_similarity: params.minSimilarity ?? 0.68,
      max_pairs: Math.min(100, Math.max(1, Math.floor(params.maxPairs || 30))),
    }),
  });

  const rawText = await response.text();
  const data = parseSupabaseResponse(rawText);
  if (!response.ok && isMissingSimilarChunksRpc(data)) {
    return [];
  }
  if (!response.ok) {
    throw new Error(resolveSupabaseErrorMessage(data, response));
  }
  if (!Array.isArray(data)) return [];
  return data
    .map(toSemanticDuplicateGroup)
    .filter((group): group is RagLibraryDuplicateGroup => Boolean(group));
}

function isMissingDocumentIdsRpc(data: unknown) {
  if (!data || typeof data !== "object") return false;
  const text = JSON.stringify(data);
  return text.includes("PGRST202") || text.includes("document_ids");
}

function isMissingSimilarChunksRpc(data: unknown) {
  if (!data || typeof data !== "object") return false;
  const text = JSON.stringify(data);
  return text.includes("PGRST202") || text.includes("find_similar_rag_library_chunks");
}

export async function upsertSupabaseRagLibraryDocument(
  document: RagLibraryDocument
) {
  const config = getSupabaseRagConfig();
  const endpoint = `${config.url}/rest/v1/rag_documents?on_conflict=library_item_id`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...buildSupabaseHeaders(config),
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify([
      {
        library_item_id: document.libraryItemId,
        source_id: document.sourceId,
        item_type: document.itemType,
        artifact_type: document.artifactType ?? null,
        title: document.title,
        summary: document.summary,
        metadata: document.metadata,
        content_hash: document.contentHash,
      },
    ]),
  });

  const rawText = await response.text();
  const data = parseSupabaseResponse(rawText);
  if (!response.ok) {
    throw new Error(resolveSupabaseErrorMessage(data, response));
  }

  const row = Array.isArray(data) ? (data[0] as SupabaseRagDocumentRow) : null;
  if (!row?.id) {
    throw new Error("Supabase RAG document upsert did not return a document id.");
  }
  return row.id;
}

export async function replaceSupabaseRagLibraryChunks(params: {
  documentId: string;
  chunks: Array<RagLibraryChunk & { embedding: number[] }>;
}) {
  const config = getSupabaseRagConfig();
  await deleteSupabaseRagLibraryChunks(config, params.documentId);
  if (params.chunks.length === 0) return;

  const endpoint = `${config.url}/rest/v1/rag_document_chunks`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...buildSupabaseHeaders(config),
      Prefer: "return=minimal",
    },
    body: JSON.stringify(
      params.chunks.map((chunk) => ({
        document_id: params.documentId,
        chunk_index: chunk.chunkIndex,
        content: chunk.content,
        token_estimate: chunk.tokenEstimate,
        metadata: chunk.metadata,
        embedding: chunk.embedding,
      }))
    ),
  });

  const rawText = await response.text();
  const data = parseSupabaseResponse(rawText);
  if (!response.ok) {
    throw new Error(resolveSupabaseErrorMessage(data, response));
  }
}

export async function deleteSupabaseRagLibraryDocument(documentId: string) {
  const config = getSupabaseRagConfig();
  const endpoint = `${config.url}/rest/v1/rag_documents?id=eq.${encodeURIComponent(
    documentId
  )}`;
  const response = await fetch(endpoint, {
    method: "DELETE",
    headers: {
      ...buildSupabaseHeaders(config),
      Prefer: "return=minimal",
    },
  });

  const rawText = await response.text();
  const data = parseSupabaseResponse(rawText);
  if (!response.ok) {
    throw new Error(resolveSupabaseErrorMessage(data, response));
  }
}

async function deleteSupabaseRagLibraryChunks(
  config: ReturnType<typeof getSupabaseRagConfig>,
  documentId: string
) {
  const endpoint = `${config.url}/rest/v1/rag_document_chunks?document_id=eq.${encodeURIComponent(
    documentId
  )}`;
  const response = await fetch(endpoint, {
    method: "DELETE",
    headers: {
      ...buildSupabaseHeaders(config),
      Prefer: "return=minimal",
    },
  });

  const rawText = await response.text();
  const data = parseSupabaseResponse(rawText);
  if (!response.ok) {
    throw new Error(resolveSupabaseErrorMessage(data, response));
  }
}

function buildSupabaseHeaders(config: ReturnType<typeof getSupabaseRagConfig>) {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "Accept-Profile": config.schema,
    "Content-Profile": config.schema,
  };
}

function parseSupabaseResponse(rawText: string): unknown {
  if (!rawText.trim()) return null;
  try {
    return JSON.parse(rawText) as unknown;
  } catch {
    return rawText.trim();
  }
}

function resolveSupabaseErrorMessage(data: unknown, response: Response) {
  const fallback = `Supabase RAG request failed (${response.status} ${
    response.statusText || "unknown"
  })`;
  if (!data || typeof data !== "object") return fallback;
  const message =
    "message" in data && typeof data.message === "string"
      ? data.message.trim()
      : "";
  const details =
    "details" in data && typeof data.details === "string"
      ? data.details.trim()
      : "";
  return [message, details].filter(Boolean).join(" ") || fallback;
}

function toRagLibrarySearchMatch(
  row: SupabaseRagMatchRow
): RagLibrarySearchMatch | null {
  if (!row.library_item_id || !row.content) return null;
  return {
    chunkId: row.chunk_id || "",
    documentId: row.document_id || "",
    libraryItemId: row.library_item_id,
    sourceId: row.source_id || "",
    title: row.title || "Untitled",
    itemType: normalizeRagItemType(row.item_type),
    artifactType: row.artifact_type || undefined,
    chunkIndex:
      typeof row.chunk_index === "number" && Number.isFinite(row.chunk_index)
        ? row.chunk_index
        : 0,
    content: row.content,
    similarity:
      typeof row.similarity === "number" && Number.isFinite(row.similarity)
        ? row.similarity
        : undefined,
    metadata: {
      ...(row.document_metadata || {}),
      ...(row.chunk_metadata || {}),
    },
  };
}

function toSemanticDuplicateGroup(
  row: SupabaseRagSimilarChunkRow
): RagLibraryDuplicateGroup | null {
  if (
    !row.left_chunk_id ||
    !row.left_document_id ||
    !row.right_chunk_id ||
    !row.right_document_id
  ) {
    return null;
  }
  const similarity =
    typeof row.similarity === "number" && Number.isFinite(row.similarity)
      ? row.similarity
      : undefined;
  return {
    id: `semantic-chunk:${row.left_chunk_id}:${row.right_chunk_id}`,
    reason: "similar_chunk",
    documentIds: [row.left_document_id, row.right_document_id],
    chunkIds: [row.left_chunk_id, row.right_chunk_id],
    titles: [row.left_title || "Untitled", row.right_title || "Untitled"],
    documentCount: row.left_document_id === row.right_document_id ? 1 : 2,
    chunkCount: 2,
    totalTokenEstimate:
      (typeof row.left_token_estimate === "number" ? row.left_token_estimate : 0) +
      (typeof row.right_token_estimate === "number" ? row.right_token_estimate : 0),
    similarity,
  };
}

function normalizeRagItemType(value: unknown): RagLibraryDocument["itemType"] {
  return value === "search" ||
    value === "kin_created" ||
    value === "ingested_file"
    ? value
    : "ingested_file";
}

async function listSupabaseRagLibraryChunksByDocumentIds(
  config: ReturnType<typeof getSupabaseRagConfig>,
  documentIds: string[]
) {
  const chunksByDocumentId = new Map<string, RagLibraryStoredChunk[]>();
  const ids = documentIds.filter(Boolean);
  if (ids.length === 0) return chunksByDocumentId;

  const chunkEndpoint = [
    `${config.url}/rest/v1/rag_document_chunks`,
    "?select=id,document_id,chunk_index,content,token_estimate,metadata,created_at,updated_at",
    `&document_id=in.(${ids.join(",")})`,
    "&order=chunk_index.asc",
  ].join("");
  const chunkResponse = await fetch(chunkEndpoint, {
    method: "GET",
    headers: buildSupabaseHeaders(config),
  });
  const chunkRawText = await chunkResponse.text();
  const chunkData = parseSupabaseResponse(chunkRawText);
  if (!chunkResponse.ok) {
    throw new Error(resolveSupabaseErrorMessage(chunkData, chunkResponse));
  }
  if (!Array.isArray(chunkData)) return chunksByDocumentId;

  chunkData
    .map(toRagLibraryStoredChunk)
    .filter((chunk): chunk is RagLibraryStoredChunk => Boolean(chunk))
    .forEach((chunk) => {
      const chunks = chunksByDocumentId.get(chunk.documentId) || [];
      chunks.push(chunk);
      chunksByDocumentId.set(chunk.documentId, chunks);
    });
  return chunksByDocumentId;
}

function toRagLibraryStoredDocument(
  row: SupabaseRagDocumentRow
): RagLibraryStoredDocument | null {
  if (!row.id || !row.library_item_id) return null;
  return {
    id: row.id,
    libraryItemId: row.library_item_id,
    sourceId: row.source_id || "",
    itemType: normalizeRagItemType(row.item_type),
    artifactType: row.artifact_type || undefined,
    title: row.title || "Untitled",
    summary: row.summary || "",
    metadata: row.metadata || {},
    contentHash: row.content_hash || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    chunks: [],
  };
}

function toRagLibraryStoredChunk(
  row: SupabaseRagChunkRow
): RagLibraryStoredChunk | null {
  if (!row.id || !row.document_id || !row.content) return null;
  return {
    id: row.id,
    documentId: row.document_id,
    chunkIndex:
      typeof row.chunk_index === "number" && Number.isFinite(row.chunk_index)
        ? row.chunk_index
        : 0,
    content: row.content,
    tokenEstimate:
      typeof row.token_estimate === "number" && Number.isFinite(row.token_estimate)
        ? row.token_estimate
        : 0,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
