import type { RagLibraryChunk, RagLibraryDocument } from "@/lib/app/reference-library/ragLibraryTypes";

const DEFAULT_TARGET_CHARS = 800;
const DEFAULT_MAX_CHARS = 1200;

export function chunkRagLibraryDocument(
  document: RagLibraryDocument,
  options: { targetChars?: number; maxChars?: number } = {}
): RagLibraryChunk[] {
  const targetChars = Math.max(200, options.targetChars || DEFAULT_TARGET_CHARS);
  const maxChars = Math.max(targetChars, options.maxChars || DEFAULT_MAX_CHARS);
  const units = splitSemanticUnits(document.content);
  const chunks: string[] = [];
  let current = "";

  for (const unit of units) {
    if (!unit) continue;
    if (unit.length > maxChars) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      chunks.push(...splitLongUnit(unit, maxChars));
      continue;
    }
    const next = current ? `${current}\n\n${unit}` : unit;
    if (current && next.length > targetChars) {
      chunks.push(current);
      current = unit;
    } else {
      current = next;
    }
  }

  if (current) chunks.push(current);

  return chunks.map((content, index) => ({
    libraryItemId: document.libraryItemId,
    chunkIndex: index,
    content,
    tokenEstimate: estimateTokenCount(content),
    metadata: {
      ...document.metadata,
      title: document.title,
      itemType: document.itemType,
      artifactType: document.artifactType,
    },
  }));
}

export function splitSemanticUnits(value: string) {
  const normalized = normalizeRagText(value);
  if (!normalized) return [];
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
  return paragraphs.flatMap((paragraph) =>
    paragraph.length <= DEFAULT_MAX_CHARS
      ? [paragraph]
      : paragraph
          .split(/(?<=[。.!?！？])\s+/u)
          .map((item) => item.trim())
          .filter(Boolean)
  );
}

export function normalizeRagText(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function estimateTokenCount(value: string) {
  const normalized = normalizeRagText(value);
  if (!normalized) return 0;
  return Math.max(1, Math.ceil(normalized.length / 4));
}

function splitLongUnit(value: string, maxChars: number) {
  const chunks: string[] = [];
  let remaining = value.trim();
  while (remaining.length > maxChars) {
    const splitAt = findSplitPoint(remaining, maxChars);
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

function findSplitPoint(value: string, maxChars: number) {
  const windowStart = Math.max(0, maxChars - 200);
  const candidates = ["\n", "。", ".", "、", ",", " "];
  for (const marker of candidates) {
    const index = value.lastIndexOf(marker, maxChars);
    if (index >= windowStart) return index + marker.length;
  }
  return maxChars;
}
