import {
  cleanImportedDocumentText,
  cleanImportSummarySource,
} from "@/lib/app/importSummaryText";

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
