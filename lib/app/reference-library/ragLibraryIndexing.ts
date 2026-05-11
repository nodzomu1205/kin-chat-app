import { createHash } from "crypto";
import type { ReferenceLibraryItem } from "@/types/chat";
import { cleanImportedDocumentText } from "@/lib/app/ingest/importSummaryText";
import {
  ragLibraryMetadataSchema,
  type RagLibraryDocument,
  type RagLibraryMetadata,
} from "@/lib/app/reference-library/ragLibraryTypes";

export function buildRagLibraryDocument(
  item: ReferenceLibraryItem,
  metadata: RagLibraryMetadata = {}
): RagLibraryDocument | null {
  const content = buildRagLibraryDocumentContent(item);
  if (!content) return null;
  const parsedMetadata = ragLibraryMetadataSchema.parse({
    ...metadata,
    sourceId: item.sourceId,
    filename: item.filename,
    taskId: item.taskId,
    taskTitle: item.taskTitle,
    kinName: item.kinName,
    completedAt: item.completedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  });
  return {
    libraryItemId: item.id,
    sourceId: item.sourceId,
    itemType: item.itemType,
    artifactType: item.artifactType,
    title: normalizeRagField(item.title) || "Untitled",
    summary: normalizeRagField(item.summary),
    content,
    metadata: parsedMetadata,
    contentHash: hashRagContent(content),
  };
}

export function buildRagLibraryDocumentContent(item: ReferenceLibraryItem) {
  const sections = [
    formatSection("Title", item.title),
    formatSection("Subtitle", item.subtitle),
    formatSection("Summary", item.summary),
    formatSection("Excerpt", cleanImportedDocumentText(item.excerptText || "")),
    formatSources(item),
  ].filter(Boolean);
  return sections.join("\n\n").trim();
}

export function hashRagContent(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function formatSection(label: string, value: string | undefined) {
  const normalized = normalizeRagField(value);
  return normalized ? `${label}: ${normalized}` : "";
}

function formatSources(item: ReferenceLibraryItem) {
  if (!item.sources?.length) return "";
  const lines = item.sources
    .slice(0, 10)
    .map((source, index) => {
      const title = normalizeRagField(source.title);
      const link = normalizeRagField(source.link);
      const snippet = normalizeRagField(source.snippet);
      return [`${index + 1}. ${title || "Untitled source"}`, link, snippet]
        .filter(Boolean)
        .join(" | ");
    })
    .filter(Boolean);
  return lines.length ? ["Sources:", ...lines].join("\n") : "";
}

function normalizeRagField(value: string | undefined) {
  return (value || "").replace(/\s+/g, " ").trim();
}
