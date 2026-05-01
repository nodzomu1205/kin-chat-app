import { buildKinSysInfoBlock } from "@/lib/app/kin-protocol/kinStructuredProtocol";
import {
  cleanImportedDocumentText,
  cleanImportSummarySource,
} from "@/lib/app/ingest/importSummaryText";
import type { ReferenceLibraryItem } from "@/types/chat";
import { parsePresentationPayload } from "@/lib/app/presentation/presentationDocumentBuilders";
import { isGeneratedImageLibraryPayload } from "@/lib/app/image/imageLibrary";
import { buildGeneratedImageDisplayText } from "@/lib/app/image/imageDisplayText";

function normalizeWhitespace(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function looksLikeFileNameLine(value: string): boolean {
  const normalized = value.trim();
  if (!normalized) return false;
  if (/\[[0-9]+\s*chars\]/i.test(normalized)) return true;
  return /\.[A-Za-z0-9]{1,8}$/.test(normalized);
}

export function normalizeLibraryChatDisplayText(text: string): string {
  const normalized = normalizeWhitespace(text);
  const blocks = normalized.split(/\n{2,}/).filter(Boolean);
  const contentBlocks = blocks
    .map((block, index) => {
      if (index === 0 && block.startsWith("Library:")) {
        return "";
      }
      if (looksLikeFileNameLine(block)) {
        return "";
      }
      return block;
    })
    .filter(Boolean);
  const normalizedBlocks = contentBlocks.map((block) => {
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

  return normalizeWhitespace(normalizedBlocks.join("\n\n"));
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
  const detail = buildLibraryItemDetailText(item);
  if (detail) {
    return normalizeLibraryChatDisplayText(detail);
  }
  return normalizeLibraryChatDisplayText(item.excerptText?.trim() || item.summary?.trim() || "");
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
  mimeType?: string;
} {
  if (item.artifactType === "generated_image") {
    const payload = isGeneratedImageLibraryPayload(item.structuredPayload)
      ? item.structuredPayload
      : null;
    if (payload) {
      return {
        fileName: item.filename?.trim() || `${payload.imageId}.txt`,
        text: normalizeWhitespace(
          item.excerptText?.trim() ||
            item.summary?.trim() ||
            buildGeneratedImageDisplayText({ payload })
        ),
      };
    }
  }

  if (item.artifactType === "presentation") {
    const payload = parsePresentationPayload(item.excerptText);
    if (payload) {
      return {
        fileName: item.filename?.trim() || `${payload.documentId}.presentation.json`,
        text: `${JSON.stringify(payload, null, 2)}\n`,
        mimeType: "application/json",
      };
    }
  }

  const rawName = (item.filename?.trim() || item.title?.trim() || "library-item")
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "_")
    .slice(0, 100);

  return {
    fileName: /\.[A-Za-z0-9]+$/.test(rawName) ? rawName : `${rawName}.txt`,
    text: buildLibraryItemChatDisplayText(item),
  };
}
