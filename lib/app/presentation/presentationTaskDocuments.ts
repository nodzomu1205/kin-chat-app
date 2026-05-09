import type { PresentationTaskPlan } from "@/types/task";

const DOCUMENT_ID_LINE = /^Document ID\s*:\s*(.+)$/im;

export function buildPresentationCommandLink(
  label: string,
  commandLines: string[],
  mode: "draft" | "run" = "draft"
) {
  return `[${label}](/__gpt-command?mode=${mode}&text=${encodeURIComponent(
    commandLines.join("\n")
  )})`;
}

export function ensurePresentationPlanDocumentId(
  plan: PresentationTaskPlan
): PresentationTaskPlan {
  return plan.documentId ? plan : { ...plan, documentId: createPresentationPlanDocumentId() };
}

export function resolvePresentationPlanDocumentId(plan: PresentationTaskPlan) {
  return plan.documentId || createPresentationPlanDocumentId();
}

export function extractPresentationPlanDocumentId(text: string) {
  return text.match(DOCUMENT_ID_LINE)?.[1]?.trim() || "";
}

export function createPresentationPlanDocumentId() {
  return `ppt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
