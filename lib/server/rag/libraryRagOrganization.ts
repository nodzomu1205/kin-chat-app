import { estimateTokenCount } from "@/lib/app/reference-library/ragLibraryChunking";
import { hashRagContent } from "@/lib/app/reference-library/ragLibraryIndexing";
import type {
  RagLibraryChunk,
  RagLibraryDocument,
  RagLibraryStoredDocument,
} from "@/lib/app/reference-library/ragLibraryTypes";
import type {
  RagLibraryOrganizationAnalysisResult,
  RagLibraryOrganizationGroup,
  RagLibraryOrganizedDocumentResult,
} from "@/lib/app/reference-library/ragLibraryOrganizationTypes";
import type { TokenUsage } from "@/lib/app/gpt-memory/gptMemoryStateHelpers";
import { addUsage, emptyUsage } from "@/lib/shared/tokenStats";
import {
  callOpenAIResponses,
  extractOpenAIJsonObjectText,
} from "@/lib/server/chatgpt/openaiClient";
import { createOpenAIEmbeddingWithUsage } from "@/lib/server/rag/openaiEmbedding";
import {
  deleteSupabaseRagLibraryDocument,
  hasSupabaseRagConfig,
  listAllSupabaseRagLibraryDocuments,
  listSupabaseRagLibraryDocumentsByIds,
  replaceSupabaseRagLibraryChunks,
  upsertSupabaseRagLibraryDocument,
} from "@/lib/server/rag/supabaseRagClient";
import { z } from "zod";

const ORGANIZATION_MODEL = "gpt-4.1-mini";
const GROUP_DOCUMENT_LIMIT = 12;

const organizationAnalysisSchema = z.object({
  groups: z.array(
    z.object({
      label: z.string().default(""),
      category: z.string().default(""),
      theme: z.string().default(""),
      documentType: z.string().default(""),
      entities: z.array(z.string()).default([]),
      documentIds: z.array(z.string()).default([]),
      targetTitle: z.string().default(""),
      suggestedChunkCount: z.number().int().min(1).max(40).default(4),
      rationale: z.string().default(""),
    })
  ).default([]),
});

const organizedDocumentSchema = z.object({
  title: z.string().default(""),
  summary: z.string().default(""),
  category: z.string().default(""),
  theme: z.string().default(""),
  documentType: z.string().default("organized_knowledge"),
  entities: z.array(z.string()).default([]),
  chunks: z.array(
    z.object({
      title: z.string().default(""),
      content: z.string().default(""),
      entities: z.array(z.string()).default([]),
      sourceDocumentIds: z.array(z.string()).default([]),
    })
  ).default([]),
});

export async function analyzeSupabaseRagLibraryOrganization(params: {
  documentIds?: string[];
} = {}): Promise<RagLibraryOrganizationAnalysisResult> {
  if (!hasSupabaseRagConfig()) {
    return {
      configured: false,
      documentsScanned: 0,
      chunksScanned: 0,
      sourceTokenEstimate: 0,
      groups: [],
    };
  }

  const documentIds = uniqueStrings(params.documentIds || []);
  const documents = documentIds.length
    ? await listSupabaseRagLibraryDocumentsByIds(documentIds)
    : await listAllSupabaseRagLibraryDocuments();
  const stats = summarizeDocuments(documents);
  if (documents.length < 2) {
    return {
      configured: true,
      ...stats,
      groups: [],
    };
  }

  const { text, usage } = await callOpenAIResponses({
    model: ORGANIZATION_MODEL,
    input: buildOrganizationAnalysisPrompt(documents),
    text: { format: buildOrganizationAnalysisJsonSchemaFormat() },
  });
  const parsed = parseJsonWithSchema(text, organizationAnalysisSchema, {
    groups: [],
  });
  const groups = normalizeAnalysisGroups(parsed.groups, documents);

  return {
    configured: true,
    ...stats,
    groups,
    usage,
  };
}

export async function createOrganizedSupabaseRagLibraryDocument(params: {
  documentIds: string[];
  targetTitle?: string;
  groupLabel?: string;
  deleteSourceDocuments?: boolean;
}): Promise<RagLibraryOrganizedDocumentResult> {
  if (!hasSupabaseRagConfig()) {
    throw new Error("Supabase RAG DB is not configured.");
  }

  const documents = await listSupabaseRagLibraryDocumentsByIds(
    params.documentIds.slice(0, GROUP_DOCUMENT_LIMIT)
  );
  if (documents.length < 2) {
    throw new Error("At least two source DB documents are required.");
  }

  const sourceStats = summarizeDocuments(documents);
  const { text, usage: generationUsage } = await callOpenAIResponses({
    model: ORGANIZATION_MODEL,
    input: buildOrganizedDocumentPrompt({
      documents,
      targetTitle: params.targetTitle,
      groupLabel: params.groupLabel,
    }),
    text: { format: buildOrganizedDocumentJsonSchemaFormat() },
  });
  const parsed = parseJsonWithSchema(text, organizedDocumentSchema, {
    title: params.targetTitle || params.groupLabel || "Organized DB knowledge",
    summary: "",
    category: "",
    theme: "",
    documentType: "organized_knowledge",
    entities: [],
    chunks: [],
  });
  const document = buildOrganizedDocument({
    parsed,
    documents,
    title: params.targetTitle,
    groupLabel: params.groupLabel,
  });
  const chunks = buildOrganizedChunks({
    parsed,
    document,
    documents,
  });
  if (chunks.length === 0) {
    throw new Error("Organized DB document did not include usable chunks.");
  }

  let usage: TokenUsage = addUsage(emptyUsage(), generationUsage);
  const chunksWithEmbeddings = [];
  for (const chunk of chunks) {
    const embeddingResult = await createOpenAIEmbeddingWithUsage(chunk.content);
    if (embeddingResult.usage) usage = addUsage(usage, embeddingResult.usage);
    chunksWithEmbeddings.push({
      ...chunk,
      embedding: embeddingResult.embedding,
    });
  }

  const documentId = await upsertSupabaseRagLibraryDocument(document);
  await replaceSupabaseRagLibraryChunks({
    documentId,
    chunks: chunksWithEmbeddings,
  });

  let deletedSourceDocumentCount = 0;
  if (params.deleteSourceDocuments) {
    for (const source of documents) {
      if (source.id === documentId) continue;
      await deleteSupabaseRagLibraryDocument(source.id);
      deletedSourceDocumentCount += 1;
    }
  }

  return {
    documentId,
    title: document.title,
    sourceDocumentCount: documents.length,
    sourceChunkCount: sourceStats.chunksScanned,
    sourceTokenEstimate: sourceStats.sourceTokenEstimate,
    outputChunkCount: chunks.length,
    outputTokenEstimate: chunks.reduce(
      (sum, chunk) => sum + chunk.tokenEstimate,
      0
    ),
    deletedSourceDocumentCount,
    usage,
  };
}

function summarizeDocuments(documents: RagLibraryStoredDocument[]) {
  const chunks = documents.flatMap((item) => item.chunks);
  return {
    documentsScanned: documents.length,
    chunksScanned: chunks.length,
    sourceTokenEstimate: chunks.reduce(
      (sum, chunk) => sum + chunk.tokenEstimate,
      0
    ),
  };
}

function buildOrganizationAnalysisPrompt(documents: RagLibraryStoredDocument[]) {
  return [
    "You are organizing a RAG knowledge base.",
    "The current DB was populated naturally, so documents and chunks may be broad, duplicated, or mixed-topic.",
    "Find practical groups that should be rebuilt into cleaner DB documents.",
    "Do not optimize for fewer chunks. A rebuilt group may need more chunks if that creates narrower, more retrievable knowledge units.",
    "Prefer groups that share category, theme, entities, or operational purpose.",
    "Read all provided chunks before proposing groups so late-document information is not ignored.",
    "Return only JSON.",
    "",
    "DB documents:",
    ...documents.map(formatDocumentForPrompt),
  ].join("\n");
}

function buildOrganizedDocumentPrompt(args: {
  documents: RagLibraryStoredDocument[];
  targetTitle?: string;
  groupLabel?: string;
}) {
  return [
    "You are rebuilding selected RAG DB documents into an optimized knowledge document.",
    "Goal: produce chunks that are efficient for retrieval and LLM context use.",
    "Important: do not merely summarize everything into fewer chunks. Split information into narrow, self-contained chunks when that improves retrieval precision, even if the output chunk count increases.",
    "Remove duplicate wording, chat/process noise, and unrelated details.",
    "Keep specific facts, constraints, names, dates, conditions, examples, and exceptions that may be useful later.",
    "Each output chunk must stand alone: include enough subject/context so it can be injected without neighboring chunks.",
    "Each chunk should usually cover one theme, rule, fact cluster, or decision point.",
    "Preserve sourceDocumentIds for traceability.",
    "Return only JSON.",
    args.targetTitle ? `Target title: ${args.targetTitle}` : "",
    args.groupLabel ? `Group label: ${args.groupLabel}` : "",
    "",
    "Source DB documents:",
    ...args.documents.map(formatDocumentForPrompt),
  ].filter(Boolean).join("\n");
}

function formatDocumentForPrompt(document: RagLibraryStoredDocument) {
  const chunkText = document.chunks
    .map(
      (chunk) =>
        `Chunk ${chunk.chunkIndex} (${chunk.tokenEstimate} tokens):\n${chunk.content}`
    )
    .join("\n\n");
  return [
    `--- DOCUMENT ${document.id}`,
    `Title: ${document.title}`,
    document.summary ? `Summary: ${document.summary}` : "",
    `Metadata: ${JSON.stringify(document.metadata || {})}`,
    chunkText,
  ].filter(Boolean).join("\n");
}

function normalizeAnalysisGroups(
  rawGroups: z.infer<typeof organizationAnalysisSchema>["groups"],
  documents: RagLibraryStoredDocument[]
): RagLibraryOrganizationGroup[] {
  const documentsById = new Map(documents.map((document) => [document.id, document]));
  const seen = new Set<string>();
  return rawGroups
    .map((group, index) => {
      const documentIds = uniqueStrings(group.documentIds)
        .filter((id) => documentsById.has(id))
        .slice(0, GROUP_DOCUMENT_LIMIT);
      if (documentIds.length < 2) return null;
      const key = documentIds.slice().sort().join("|");
      if (seen.has(key)) return null;
      seen.add(key);
      const sourceDocuments = documentIds
        .map((id) => documentsById.get(id))
        .filter((item): item is RagLibraryStoredDocument => Boolean(item));
      const stats = summarizeDocuments(sourceDocuments);
      return {
        id: `organization:${index}:${stableShortFingerprint(key)}`,
        label: trimText(group.label, 80) || trimText(group.theme, 80) || "DB organization group",
        category: trimText(group.category, 80) || "uncategorized",
        theme: trimText(group.theme, 120) || "unspecified",
        documentType: trimText(group.documentType, 80) || "organized_knowledge",
        entities: uniqueStrings(group.entities).slice(0, 8),
        documentIds,
        sourceDocumentCount: sourceDocuments.length,
        sourceChunkCount: stats.chunksScanned,
        sourceTokenEstimate: stats.sourceTokenEstimate,
        suggestedChunkCount: Math.max(1, Math.floor(group.suggestedChunkCount || 4)),
        targetTitle:
          trimText(group.targetTitle, 120) ||
          `整理済みDB: ${trimText(group.label || group.theme, 80) || "knowledge"}`,
        rationale: trimText(group.rationale, 300),
      };
    })
    .filter((group): group is RagLibraryOrganizationGroup => Boolean(group))
    .sort((left, right) => right.sourceTokenEstimate - left.sourceTokenEstimate)
    .slice(0, 12);
}

function buildOrganizedDocument(args: {
  parsed: z.infer<typeof organizedDocumentSchema>;
  documents: RagLibraryStoredDocument[];
  title?: string;
  groupLabel?: string;
}): RagLibraryDocument {
  const title =
    trimText(args.title, 120) ||
    trimText(args.parsed.title, 120) ||
    `整理済みDB: ${trimText(args.groupLabel || "", 80) || "knowledge"}`;
  const sourceDocumentIds = args.documents.map((document) => document.id);
  const content = [
    `Title: ${title}`,
    args.parsed.summary ? `Summary: ${args.parsed.summary}` : "",
    args.parsed.category ? `Category: ${args.parsed.category}` : "",
    args.parsed.theme ? `Theme: ${args.parsed.theme}` : "",
    args.parsed.entities.length
      ? `Entities: ${args.parsed.entities.join(", ")}`
      : "",
    "Source document IDs:",
    ...sourceDocumentIds.map((id) => `- ${id}`),
    "Optimized chunks:",
    ...args.parsed.chunks
      .map((chunk, index) => {
        const heading = trimText(chunk.title, 120) || `Chunk ${index + 1}`;
        return `## ${heading}\n${chunk.content.trim()}`;
      })
      .filter(Boolean),
  ].filter(Boolean).join("\n\n");
  const now = new Date().toISOString();
  return {
    libraryItemId: `organize:${Date.now()}:${hashRagContent(content).slice(0, 12)}`,
    sourceId: `organize:${sourceDocumentIds.join(",").slice(0, 80)}`,
    itemType: "kin_created",
    title,
    summary:
      trimText(args.parsed.summary, 500) ||
      "DB整理により、検索しやすい知識単位へ再構成した文書です。",
    content,
    metadata: {
      category: trimText(args.parsed.category, 120) || undefined,
      documentType:
        trimText(args.parsed.documentType, 120) || "organized_knowledge",
      createdAt: now,
      theme: trimText(args.parsed.theme, 160),
      entities: args.parsed.entities,
      sourceDocumentIds,
      sourceLibraryItemIds: args.documents.map((document) => document.libraryItemId),
      sourceTitles: args.documents.map((document) => document.title),
      organizationMode: "rag_optimized",
    },
    contentHash: hashRagContent(content),
  };
}

function buildOrganizedChunks(args: {
  parsed: z.infer<typeof organizedDocumentSchema>;
  document: RagLibraryDocument;
  documents: RagLibraryStoredDocument[];
}): RagLibraryChunk[] {
  const sourceIds = new Set(args.documents.map((document) => document.id));
  const chunks: RagLibraryChunk[] = [];
  args.parsed.chunks.forEach((chunk) => {
    const rawContent = chunk.content.trim();
    if (!rawContent) return;
    const chunkTitle = trimText(chunk.title, 120);
    const sourceDocumentIds = uniqueStrings(chunk.sourceDocumentIds).filter((id) =>
      sourceIds.has(id)
    );
    const content = [
      chunkTitle ? `Topic: ${chunkTitle}` : "",
      rawContent,
      sourceDocumentIds.length
        ? `Source document IDs: ${sourceDocumentIds.join(", ")}`
        : "",
    ].filter(Boolean).join("\n");
    chunks.push({
      libraryItemId: args.document.libraryItemId,
      chunkIndex: chunks.length,
      content,
      tokenEstimate: estimateTokenCount(content),
      metadata: {
        ...args.document.metadata,
        title: args.document.title,
        itemType: args.document.itemType,
        artifactType: args.document.artifactType,
        chunkTitle,
        chunkEntities: uniqueStrings(chunk.entities),
        sourceDocumentIds,
      },
    });
  });
  return chunks;
}

function buildOrganizationAnalysisJsonSchemaFormat() {
  return {
    type: "json_schema",
    name: "rag_db_organization_analysis",
    strict: false,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["groups"],
      properties: {
        groups: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "label",
              "category",
              "theme",
              "documentType",
              "entities",
              "documentIds",
              "targetTitle",
              "suggestedChunkCount",
              "rationale",
            ],
            properties: {
              label: { type: "string" },
              category: { type: "string" },
              theme: { type: "string" },
              documentType: { type: "string" },
              entities: { type: "array", items: { type: "string" } },
              documentIds: { type: "array", items: { type: "string" } },
              targetTitle: { type: "string" },
              suggestedChunkCount: { type: "integer", minimum: 1, maximum: 40 },
              rationale: { type: "string" },
            },
          },
        },
      },
    },
  };
}

function buildOrganizedDocumentJsonSchemaFormat() {
  return {
    type: "json_schema",
    name: "rag_db_organized_document",
    strict: false,
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "title",
        "summary",
        "category",
        "theme",
        "documentType",
        "entities",
        "chunks",
      ],
      properties: {
        title: { type: "string" },
        summary: { type: "string" },
        category: { type: "string" },
        theme: { type: "string" },
        documentType: { type: "string" },
        entities: { type: "array", items: { type: "string" } },
        chunks: {
          type: "array",
          minItems: 1,
          maxItems: 60,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["title", "content", "entities", "sourceDocumentIds"],
            properties: {
              title: { type: "string" },
              content: { type: "string" },
              entities: { type: "array", items: { type: "string" } },
              sourceDocumentIds: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
    },
  };
}

function parseJsonWithSchema<T extends z.ZodTypeAny>(
  text: string,
  schema: T,
  fallback: z.infer<T>
): z.infer<T> {
  const jsonText = extractOpenAIJsonObjectText(text, "{}");
  try {
    return schema.parse(JSON.parse(jsonText));
  } catch {
    return fallback;
  }
}

function trimText(value: string | undefined, maxChars: number) {
  const text = (value || "").trim();
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars).trimEnd();
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function stableShortFingerprint(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}
