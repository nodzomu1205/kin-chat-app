import { buildKinSysInfoBlock } from "@/lib/app/kinStructuredProtocol";
import {
  cleanImportedDocumentText,
  cleanImportSummarySource,
} from "@/lib/app/importSummaryText";
import type { ReferenceLibraryItem } from "@/types/chat";

function normalizeWhitespace(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function normalizeLibraryChatDisplayText(text: string): string {
  const normalized = normalizeWhitespace(text);
  if (!normalized.startsWith("Library:")) {
    return normalized;
  }

  const blocks = normalized.split(/\n{2,}/).filter(Boolean);
  const [header, ...rest] = blocks;
  const normalizedBlocks = rest.map((block) => {
    if (block.startsWith("Summary:\n")) {
      return `Summary:\n${cleanImportSummarySource(
        block.slice("Summary:\n".length)
      ).trim()}`;
    }
    if (block.startsWith("Detail:\n")) {
      return `Detail:\n${cleanImportedDocumentText(
        block.slice("Detail:\n".length)
      ).trim()}`;
    }
    return block;
  });

  return normalizeWhitespace([header, ...normalizedBlocks].join("\n\n"));
}

function buildLibraryItemDetailText(item: ReferenceLibraryItem): string {
  const blocks = [
    item.summary?.trim()
      ? `Summary:\n${cleanImportSummarySource(item.summary).trim()}`
      : "",
    item.excerptText?.trim()
      ? `Detail:\n${cleanImportedDocumentText(item.excerptText).trim()}`
      : "",
  ].filter(Boolean);

  return normalizeWhitespace(blocks.join("\n\n"));
}

export function buildLibraryItemChatDisplayText(item: ReferenceLibraryItem): string {
  const header = [`Library`, item.title?.trim() || "Untitled"].join(": ");
  const detail = buildLibraryItemDetailText(item);
  return normalizeLibraryChatDisplayText(
    normalizeWhitespace([header, detail].filter(Boolean).join("\n\n"))
  );
}

export function buildLibraryItemKinSysInfo(item: ReferenceLibraryItem): string {
  return buildKinSysInfoBlock({
    title: item.title?.trim() || "Library Item",
    content: buildLibraryItemDetailText(item),
    directiveLines: [
      "Use this library material as reference context.",
      "Preserve the title and summary when they are relevant.",
    ],
  });
}

export function buildLibraryItemDriveExport(item: ReferenceLibraryItem): {
  fileName: string;
  text: string;
} {
  const safeBaseName = (item.title?.trim() || "library-item")
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 80);

  return {
    fileName: `${safeBaseName || "library-item"}.txt`,
    text: buildLibraryItemChatDisplayText(item),
  };
}
