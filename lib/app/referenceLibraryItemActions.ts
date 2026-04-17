import { buildKinSysInfoBlock } from "@/lib/app/kinStructuredProtocol";
import type { ReferenceLibraryItem } from "@/types/chat";

function normalizeWhitespace(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function buildLibraryItemDetailText(item: ReferenceLibraryItem): string {
  const blocks = [
    item.summary?.trim() ? `Summary:\n${item.summary.trim()}` : "",
    item.excerptText?.trim() ? `Detail:\n${item.excerptText.trim()}` : "",
  ].filter(Boolean);

  return normalizeWhitespace(blocks.join("\n\n"));
}

export function buildLibraryItemChatDisplayText(item: ReferenceLibraryItem): string {
  const header = [`Library`, item.title?.trim() || "Untitled"].join(": ");
  const detail = buildLibraryItemDetailText(item);
  return normalizeWhitespace([header, detail].filter(Boolean).join("\n\n"));
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
