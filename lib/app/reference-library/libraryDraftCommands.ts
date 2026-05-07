import { isGeneratedImageLibraryPayload } from "@/lib/app/image/imageLibrary";
import { resolveTaskSnapshotDocumentId } from "@/lib/app/task-draft/taskSnapshotDocument";
import type { ReferenceLibraryItem } from "@/types/chat";

const SUBTITLE_ID_PATTERN = /^(?:Document ID|Image ID)\s*:\s*(\S+)/i;
const VISUAL_SELECTION_LINE_PATTERN =
  /^((?:Slide\s+\d+\s*\/\s*block\s+\d+)|(?:Opening\s+slide\s*\/\s*visual))\s*:\s*$/i;

export function buildLibraryItemEditDraftCommand(item: ReferenceLibraryItem) {
  const documentId = resolveLibraryItemDocumentId(item);
  if (!documentId) return "";
  if (item.artifactType === "presentation_plan") {
    return `/ppt\nDocument ID: ${documentId}\n`;
  }
  if (item.artifactType === "task_snapshot") {
    return `/task\nDocument ID: ${documentId}\n`;
  }
  return "";
}

export function resolveLibraryItemImageId(item: ReferenceLibraryItem) {
  const payload = isGeneratedImageLibraryPayload(item.structuredPayload)
    ? item.structuredPayload
    : null;
  return payload?.imageId || extractPrimaryIdFromSubtitle(item.subtitle);
}

export function insertImageIdIntoGptDraft(currentText: string, imageId: string) {
  const cleanImageId = imageId.trim();
  if (!cleanImageId) return currentText;
  if (!currentText.trim()) return cleanImageId;

  const lineBreak = currentText.includes("\r\n") ? "\r\n" : "\n";
  const lines = currentText.split(/\r?\n/);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (VISUAL_SELECTION_LINE_PATTERN.test(lines[index])) {
      lines[index] = `${lines[index].replace(/\s+$/u, "")} ${cleanImageId}`;
      return lines.join(lineBreak);
    }
  }

  return currentText.endsWith("\n") || currentText.endsWith("\r\n")
    ? `${currentText}${cleanImageId}`
    : `${currentText}\n${cleanImageId}`;
}

function resolveLibraryItemDocumentId(item: ReferenceLibraryItem) {
  if (item.artifactType === "task_snapshot") {
    return (
      resolveTaskSnapshotDocumentId(item.structuredPayload) ||
      extractPrimaryIdFromSubtitle(item.subtitle)
    );
  }
  if (item.artifactType === "presentation_plan") {
    return (
      resolvePresentationPlanDocumentId(item.structuredPayload) ||
      extractPrimaryIdFromSubtitle(item.subtitle)
    );
  }
  return "";
}

function resolvePresentationPlanDocumentId(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const documentId = (value as { documentId?: unknown }).documentId;
  return typeof documentId === "string" ? documentId.trim() : "";
}

function extractPrimaryIdFromSubtitle(subtitle: string) {
  return subtitle.match(SUBTITLE_ID_PATTERN)?.[1]?.trim() || "";
}
