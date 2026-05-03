import type { ReferenceLibraryItem } from "@/types/chat";
import {
  buildLibraryItemKinSysInfo,
} from "@/lib/app/reference-library/referenceLibraryItemActions";
import { cleanImportedDocumentText } from "@/lib/app/ingest/importSummaryText";

export type LibraryBulkActionMode = "index" | "summary" | "detail";
export type LibraryBulkActionScope = "library" | "images";

function normalizeLine(value: string | undefined) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function buildItemIndexLine(item: ReferenceLibraryItem, index: number) {
  const title = normalizeLine(item.title) || "Untitled";
  const type = normalizeLine(item.itemType);
  const subtitle = normalizeLine(item.subtitle);
  return [`${index + 1}. ${title}`, type ? `[${type}]` : "", subtitle]
    .filter(Boolean)
    .join(" ");
}

function buildItemSummaryBlock(item: ReferenceLibraryItem) {
  const summary = normalizeLine(item.summary);
  return summary ? `Summary: ${summary}` : "Summary: none";
}

function buildItemDetailBlock(item: ReferenceLibraryItem) {
  const detail = cleanImportedDocumentText(item.excerptText || "").trim();
  return detail ? `Detail:\n${detail}` : "Detail: none";
}

export function buildLibraryItemsAggregateText(params: {
  items: ReferenceLibraryItem[];
  mode: LibraryBulkActionMode;
}) {
  const items = params.items.filter(Boolean);
  const lines = [
    "Library Data",
    `Mode: ${params.mode}`,
    `Items: ${items.length}`,
    "",
  ];

  items.forEach((item, index) => {
    lines.push(buildItemIndexLine(item, index));
    if (params.mode === "summary" || params.mode === "detail") {
      lines.push("");
      lines.push(buildItemSummaryBlock(item));
    }
    if (params.mode === "detail") {
      lines.push("");
      lines.push(buildItemDetailBlock(item));
    }
    if (index < items.length - 1 && params.mode !== "index") {
      lines.push("");
    }
  });

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function buildLibraryItemsAggregateKinSysInfo(params: {
  items: ReferenceLibraryItem[];
  mode: LibraryBulkActionMode;
  scope?: LibraryBulkActionScope;
}) {
  if (params.items.length === 1 && params.scope !== "images") {
    return buildLibraryItemKinSysInfo(params.items[0]);
  }

  const imageScope = params.scope === "images";
  return [
    "<<SYS_INFO>>",
    imageScope ? "TITLE: Image Library Data" : "TITLE: Library Data",
    imageScope
      ? "DIRECTIVE: Use these image-library records as visual reference candidates. Preserve Image IDs when they are relevant."
      : "DIRECTIVE: Use this library material as reference context. Preserve item boundaries when they are relevant.",
    "CONTENT:",
    buildLibraryItemsAggregateText(params),
    "<<END_SYS_INFO>>",
  ].join("\n");
}
