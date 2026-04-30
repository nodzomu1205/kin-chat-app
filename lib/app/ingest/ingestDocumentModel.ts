import {
  cleanImportedDocumentText,
  cleanImportSummarySource,
} from "@/lib/app/ingest/importSummaryText";
import type { ReferenceLibraryItem, StoredDocument } from "@/types/chat";

type ResolveCanonicalDocumentTextArgs = {
  selectedText?: string;
  rawText?: string;
  fallbackText?: string;
};

const CHAR_COUNT_SUFFIX_PATTERNS = [
  /\s*__\d+chars$/i,
  /\s*[_-]\d+chars$/i,
  /\s*\[\d+\s*chars\]$/i,
  /\s*\(\d+\s*chars\)$/i,
  /\s*\d+\s*chars$/i,
];

function stripTrailingCharCount(value: string) {
  return CHAR_COUNT_SUFFIX_PATTERNS.reduce(
    (current, pattern) => current.replace(pattern, "").trim(),
    value
  );
}

function stripTrailingExtension(value: string) {
  return value.replace(/(\.[A-Za-z0-9]+)+$/u, "").trim();
}

function collapseDocumentLabelWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function clipNaturalDocumentTitle(value: string, limit: number) {
  const normalized = collapseDocumentLabelWhitespace(value);
  if (!normalized) return "";

  const parentheticalPrefixMatch = normalized.match(
    /^(.+?[)）])(?:は|が|を|に|で|と|も|へ|から|より|、|,|\s).*/u
  );
  if (parentheticalPrefixMatch && parentheticalPrefixMatch[1].trim().length >= 12) {
    return parentheticalPrefixMatch[1].trim();
  }

  if (normalized.length <= limit) return normalized;

  const candidate = normalized.slice(0, limit);
  const naturalCut = Math.max(
    candidate.lastIndexOf("）"),
    candidate.lastIndexOf(")"),
    candidate.lastIndexOf(" - "),
    candidate.lastIndexOf(" | "),
    candidate.lastIndexOf("："),
    candidate.lastIndexOf(":"),
    candidate.lastIndexOf("、"),
    candidate.lastIndexOf(","),
    candidate.lastIndexOf(" ")
  );
  const clipped =
    naturalCut >= Math.floor(limit * 0.55)
      ? candidate.slice(0, naturalCut).trim()
      : candidate.trim();

  return `${clipped}...`;
}

export function normalizeIngestedDocumentTitle(value: string, limit = 46) {
  return clipNaturalDocumentTitle(value, limit);
}

export function buildIngestedDocumentFilename(args: {
  title: string;
  fallbackFilename: string;
}) {
  const fallbackName = args.fallbackFilename.trim() || "imported-document.txt";
  const extensionMatch = fallbackName.match(/(\.[A-Za-z0-9]+)$/u);
  const extension = extensionMatch?.[1] || ".txt";
  const preferredBase = normalizeIngestedDocumentTitle(args.title, 58);
  const fallbackBase = stripTrailingExtension(
    stripTrailingCharCount(fallbackName.split(/[\\/]/).pop() || fallbackName)
  );
  const baseName = (preferredBase || fallbackBase || "imported-document").trim();
  return `${baseName}${extension}`;
}

function normalizeComparableDocumentLabel(value: string) {
  return stripTrailingCharCount(stripTrailingExtension(value))
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function buildCompactLibraryFilenameLabel(args: {
  filename: string;
  title?: string;
}) {
  const trimmedFilename = args.filename.trim();
  if (!trimmedFilename) return "";

  const compactMatch = trimmedFilename.match(
    /(\[\d+\s*chars\])((?:\.[A-Za-z0-9]+)+)$/iu
  );
  const normalizedTitle = normalizeComparableDocumentLabel(args.title || "");
  const normalizedFilename = normalizeComparableDocumentLabel(trimmedFilename);

  if (
    compactMatch &&
    normalizedTitle &&
    normalizedFilename &&
    normalizedTitle === normalizedFilename
  ) {
    return `${compactMatch[1]}${compactMatch[2]}`;
  }

  return trimmedFilename;
}

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

export function cleanSearchLibraryDisplayText(text: string) {
  return cleanImportedDocumentText(text)
    .replace(/^\s*Google AI Mode\s*\n+/iu, "")
    .replace(/(?:^|\n)#{1,6}\s*References\s*\n[\s\S]*$/iu, "")
    .replace(/(?:^|\n)Supporting links\s*\n[\s\S]*$/iu, "")
    .replace(/\s*\[refs?:\s*[\d,\s-]+\]/giu, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
    .split(/(?<=[。．.!?])/u)
    .map((part) => part.trim())
    .filter(Boolean);
  const summary = (sentenceParts.slice(0, 2).join(" ") || basis).trim();
  return summary.length > 220 ? `${summary.slice(0, 220).trimEnd()}...` : summary;
}

export function buildStoredDocumentSummary(text: string, fallbackTitle: string) {
  return buildCanonicalDocumentSummary(text, fallbackTitle);
}

export function buildLibraryFilenameWithCharCount(filename: string, text: string) {
  const trimmed = filename.trim() || "library-item.txt";
  const extensionMatch = trimmed.match(/(\.[A-Za-z0-9]+)$/);
  const extension = extensionMatch?.[1] || ".txt";
  const baseName = extensionMatch ? trimmed.slice(0, -extension.length) : trimmed;
  let normalizedBaseName = CHAR_COUNT_SUFFIX_PATTERNS.reduce(
    (current, pattern) => current.replace(pattern, "").trim(),
    baseName
  );
  const escapedExtension = extension.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const duplicatedExtensionPattern = new RegExp(`${escapedExtension}$`, "i");
  while (duplicatedExtensionPattern.test(normalizedBaseName)) {
    normalizedBaseName = normalizedBaseName
      .replace(duplicatedExtensionPattern, "")
      .trim();
  }
  const charCount = Array.from(text.trim()).length;
  return `${normalizedBaseName || "library-item"} [${charCount}chars]${extension}`;
}

export function buildStoredDocumentDisplayTitle(args: {
  title: string;
  filename: string;
  sourceType: StoredDocument["sourceType"];
}) {
  if (args.sourceType !== "ingested_file") {
    return args.title.trim() || args.filename.trim() || "Untitled";
  }

  const preferred = args.title.trim() || args.filename.trim();
  const tailSegment = preferred.split(/[\\/]/).pop() || preferred;
  const withoutCount = stripTrailingCharCount(tailSegment);
  const withoutExtension = stripTrailingExtension(withoutCount);
  const normalizedTitle = normalizeIngestedDocumentTitle(
    withoutExtension || withoutCount || tailSegment
  );
  return normalizedTitle || withoutExtension || withoutCount || tailSegment || "Untitled";
}

export function normalizeStoredDocument(item: StoredDocument): StoredDocument {
  const cleanedText = cleanImportedDocumentText(item.text);
  const cleanedSummary = item.summary
    ? cleanImportSummarySource(item.summary).trim()
    : "";

  return {
    ...item,
    title: buildStoredDocumentDisplayTitle({
      title: item.title,
      filename: item.filename,
      sourceType: item.sourceType,
    }),
    text: cleanedText,
    filename: buildLibraryFilenameWithCharCount(item.filename, cleanedText),
    summary:
      cleanedSummary ||
      (item.sourceType === "kin_created"
        ? buildStoredDocumentSummary(cleanedText, item.title)
        : ""),
    charCount: cleanedText.length,
  };
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
  structuredPayload?: StoredDocument["structuredPayload"];
  createdAt: string;
  updatedAt: string;
}): StoredDocument {
  return normalizeStoredDocument({
    ...args,
    sourceType: "ingested_file",
    charCount: args.text.length,
  });
}

export function buildIngestedDocumentRecord(args: {
  title: string;
  filename: string;
  text: string;
  summary?: string;
  taskId?: string;
  taskTitle?: string;
  kinName?: string;
  completedAt?: string;
  timestamp: string;
}): Omit<StoredDocument, "id" | "sourceType"> {
  const text = cleanImportedDocumentText(args.text);
  return {
    title: args.title,
    filename: args.filename,
    text,
    summary: args.summary,
    taskId: args.taskId,
    taskTitle: args.taskTitle,
    kinName: args.kinName,
    completedAt: args.completedAt,
    charCount: text.length,
    createdAt: args.timestamp,
    updatedAt: args.timestamp,
  };
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

  return {
    id: `doc:${normalizedItem.id}`,
    sourceId: normalizedItem.id,
    itemType: normalizedItem.sourceType,
    artifactType: normalizedItem.artifactType,
    title: normalizedItem.title,
    subtitle: buildCompactLibraryFilenameLabel({
      filename: normalizedItem.filename,
      title: normalizedItem.title,
    }),
    summary: normalizedItem.summary || "",
    excerptText: normalizedItem.text,
    createdAt: normalizedItem.createdAt,
    updatedAt: normalizedItem.updatedAt,
    filename: normalizedItem.filename,
    taskId: normalizedItem.taskId,
    taskTitle: normalizedItem.taskTitle,
    kinName: normalizedItem.kinName,
    completedAt: normalizedItem.completedAt,
    structuredPayload: normalizedItem.structuredPayload,
  };
}

export function buildReferenceLibrarySearchItem(args: {
  rawResultId: string;
  mode?: string;
  engine?: string;
  engines?: string[];
  query: string;
  summary: string;
  rawText: string;
  createdAt: string;
  taskId?: string;
  sources?: ReferenceLibraryItem["sources"];
  askAiModeItems?: ReferenceLibraryItem["askAiModeItems"];
}): ReferenceLibraryItem {
  const cleanedRawText = cleanSearchLibraryDisplayText(args.rawText || "");
  const cleanedSummary = args.summary
    ? cleanImportSummarySource(args.summary).trim()
    : "";
  const filename = buildLibraryFilenameWithCharCount(
    `${args.query || "search-result"}.txt`,
    cleanedRawText
  );

  return {
    id: `search:${args.rawResultId}`,
    sourceId: args.rawResultId,
    itemType: "search",
    title: args.query,
    subtitle: buildCompactLibraryFilenameLabel({
      filename,
      title: args.query,
    }),
    summary: cleanedSummary,
    excerptText: cleanedRawText,
    createdAt: args.createdAt,
    updatedAt: args.createdAt,
    rawResultId: args.rawResultId,
    taskId: args.taskId,
    sources: isAiModeReferenceSearch(args) ? undefined : args.sources,
    askAiModeItems: args.askAiModeItems,
    filename,
  };
}

export function isAiModeReferenceSearch(args: {
  mode?: string;
  engine?: string;
  engines?: string[];
}) {
  return (
    args.mode === "ai" ||
    args.engine === "google_ai_mode" ||
    args.engines?.includes("google_ai_mode")
  );
}
