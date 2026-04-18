import {
  cleanImportedDocumentText,
  cleanImportSummarySource,
} from "@/lib/app/importSummaryText";
import type {
  MultipartAssembly,
  ReferenceLibraryItem,
  StoredDocument,
} from "@/types/chat";

type ResolveCanonicalDocumentTextArgs = {
  selectedText?: string;
  rawText?: string;
  fallbackText?: string;
};

export function stripTaskPrepEnvelopeMetadata(text: string) {
  return text
    .replace(/^File:\s.*(?:\r?\n)+/u, "")
    .replace(/^Title:\s.*(?:\r?\n)+/u, "")
    .replace(/^Content:\s*(?:\r?\n)?/u, "")
    .trim();
}

export function resolveCanonicalDocumentText({
  selectedText = "",
  rawText = "",
  fallbackText = "",
}: ResolveCanonicalDocumentTextArgs) {
  const cleanSelectedText = cleanImportedDocumentText(selectedText);
  if (cleanSelectedText) return cleanSelectedText;

  const cleanRawText = cleanImportedDocumentText(rawText);
  if (cleanRawText) return cleanRawText;

  return cleanImportedDocumentText(stripTaskPrepEnvelopeMetadata(fallbackText));
}

export function buildTaskPrepEnvelope(args: {
  fileName: string;
  title: string;
  content: string;
}) {
  return [
    `File: ${args.fileName}`,
    `Title: ${args.title}`,
    args.content.trim() ? `Content:\n${args.content.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildCanonicalSummarySource(text: string) {
  return cleanImportSummarySource(text).trim();
}

export function buildCanonicalDocumentSummary(
  text: string,
  fallbackTitle: string
) {
  const trimmed = buildCanonicalSummarySource(text);
  if (!trimmed) return fallbackTitle;
  const normalized = trimmed.replace(/\s+/g, " ").trim();
  const withoutTitle = normalized.startsWith(fallbackTitle)
    ? normalized.slice(fallbackTitle.length).trimStart()
    : normalized;
  const basis = withoutTitle || normalized;
  const sentenceParts = basis
    .split(/(?<=[。！？.!?])/u)
    .map((part) => part.trim())
    .filter(Boolean);
  const summary = (sentenceParts.slice(0, 2).join(" ") || basis).trim();
  return summary.length > 220 ? `${summary.slice(0, 220).trimEnd()}...` : summary;
}

export function buildStoredDocumentSummary(text: string, fallbackTitle: string) {
  return buildCanonicalDocumentSummary(text, fallbackTitle);
}

export function normalizeStoredDocument(item: StoredDocument): StoredDocument {
  const cleanedText = cleanImportedDocumentText(item.text);
  const cleanedSummary = item.summary
    ? cleanImportSummarySource(item.summary).trim()
    : "";

  return {
    ...item,
    text: cleanedText,
    summary: cleanedSummary || buildStoredDocumentSummary(cleanedText, item.title),
    charCount: cleanedText.length,
  };
}

export function buildKinStoredDocument(item: MultipartAssembly): StoredDocument {
  return normalizeStoredDocument({
    id: `kin:${item.id}`,
    sourceType: "kin_created",
    artifactType: item.artifactType,
    title: item.filename,
    filename: item.filename,
    text: item.assembledText,
    summary: item.summary,
    taskId: item.taskId,
    taskTitle: item.taskTitle,
    kinName: item.kinName,
    completedAt: item.completedAt,
    charCount: item.assembledText.length,
    createdAt: item.updatedAt,
    updatedAt: item.updatedAt,
  });
}

export function buildIngestedStoredDocument(args: {
  id: string;
  artifactType?: StoredDocument["artifactType"];
  title: string;
  filename: string;
  text: string;
  summary?: string;
  taskId?: string;
  taskTitle?: string;
  kinName?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}): StoredDocument {
  return normalizeStoredDocument({
    ...args,
    sourceType: "ingested_file",
    charCount: args.text.length,
  });
}

export function applyStoredDocumentOverride(
  item: StoredDocument,
  override?: Partial<StoredDocument>
): StoredDocument {
  if (!override) return normalizeStoredDocument(item);

  return normalizeStoredDocument({
    ...item,
    ...override,
    title: typeof override.title === "string" ? override.title : item.title,
    text: typeof override.text === "string" ? override.text : item.text,
    summary:
      typeof override.summary === "string" ? override.summary : item.summary,
    updatedAt:
      typeof override.updatedAt === "string" ? override.updatedAt : item.updatedAt,
  });
}

export function buildReferenceLibraryDocumentItem(
  item: StoredDocument
): ReferenceLibraryItem {
  const normalizedItem = normalizeStoredDocument(item);
  const detailPrefix =
    normalizedItem.artifactType === "task_result"
      ? "謌先棡迚ｩ"
      : normalizedItem.artifactType === "task_snapshot"
        ? "繧ｿ繧ｹ繧ｯ菫晏ｭ・"
        : normalizedItem.sourceType === "kin_created"
          ? "Kin菴懈・"
          : "蜿冶ｾｼ";

  const subtitleParts = [
    detailPrefix,
    normalizedItem.taskTitle || normalizedItem.filename,
    normalizedItem.kinName || "",
    normalizedItem.completedAt
      ? new Date(normalizedItem.completedAt).toLocaleString("ja-JP", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
  ].filter(Boolean);

  return {
    id: `doc:${normalizedItem.id}`,
    sourceId: normalizedItem.id,
    itemType: normalizedItem.sourceType,
    artifactType: normalizedItem.artifactType,
    title: normalizedItem.title,
    subtitle: subtitleParts.join(" / "),
    summary:
      normalizedItem.summary ||
      buildStoredDocumentSummary(normalizedItem.text, normalizedItem.title),
    excerptText: normalizedItem.text,
    createdAt: normalizedItem.createdAt,
    updatedAt: normalizedItem.updatedAt,
    filename: normalizedItem.filename,
    taskId: normalizedItem.taskId,
    taskTitle: normalizedItem.taskTitle,
    kinName: normalizedItem.kinName,
    completedAt: normalizedItem.completedAt,
  };
}
