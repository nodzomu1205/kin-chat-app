import type { StoredDocument } from "@/types/chat";
import type { PresentationTaskPlan } from "@/types/task";
import type { ParsedPresentationPlanSidecar } from "@/lib/app/presentation/presentationPlanSidecar";
export {
  buildPresentationPlanSidecarArtifact,
  buildPresentationPlanSidecarFileName,
  buildPresentationPlanSidecarText,
  isPresentationTaskPlan,
  parsePresentationPlanSidecarText,
} from "@/lib/app/presentation/presentationPlanSidecar";
export type {
  ParsedPresentationPlanSidecar,
  PresentationPlanSidecarPayload,
} from "@/lib/app/presentation/presentationPlanSidecar";

export function buildPortablePresentationPlanStoredDocument(args: {
  title: string;
  filename: string;
  text: string;
  summary?: string;
  plan: PresentationTaskPlan;
  taskId?: string;
  timestamp?: string;
}): Omit<StoredDocument, "id" | "sourceType"> {
  const text = args.text.trim();
  const timestamp = args.timestamp || new Date().toISOString();
  return {
    artifactType: "presentation_plan",
    title: args.title.trim() || args.plan.title || "PPT Design",
    filename: args.filename.trim() || `${args.title || args.plan.title || "PPT Design"}.txt`,
    text,
    summary: args.summary?.trim() || "",
    taskId: args.taskId,
    charCount: text.length,
    structuredPayload: args.plan,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function buildStoredDocumentFromPortablePresentationPlanImport(args: {
  sidecar: ParsedPresentationPlanSidecar;
  filename: string;
  text: string;
  fallbackTitle: string;
  taskId?: string;
  timestamp?: string;
}) {
  const title =
    args.sidecar.title?.trim() ||
    args.fallbackTitle.trim() ||
    args.filename.replace(/\.[^.]+$/u, "").trim() ||
    args.filename;
  return buildPortablePresentationPlanStoredDocument({
    title,
    filename: args.filename,
    text: args.text,
    summary: args.sidecar.summary,
    plan: args.sidecar.plan,
    taskId: args.taskId,
    timestamp: args.timestamp,
  });
}
