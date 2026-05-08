import type { StoredDocument } from "@/types/chat";
import type { PresentationTaskPlan } from "@/types/task";
import { buildPortableSidecarFileName } from "@/lib/app/reference-library/portableSidecarNames";

const PORTABLE_PRESENTATION_PLAN_KIND = "kin.presentation_plan";

export type PresentationPlanSidecarPayload = {
  kind: typeof PORTABLE_PRESENTATION_PLAN_KIND;
  version: "0.1";
  title?: string;
  filename?: string;
  summary?: string;
  exportedAt?: string;
  plan: PresentationTaskPlan;
};

export type ParsedPresentationPlanSidecar = {
  title?: string;
  filename?: string;
  summary?: string;
  plan: PresentationTaskPlan;
};

export function isPresentationTaskPlan(value: unknown): value is PresentationTaskPlan {
  return (
    !!value &&
    typeof value === "object" &&
    (value as PresentationTaskPlan).version === "0.1-presentation-task-plan"
  );
}

export function buildPresentationPlanSidecarFileName(args: {
  filename?: string;
  title?: string;
}) {
  return buildPortableSidecarFileName({
    filename: args.filename,
    title: args.title,
    fallbackBaseName: "presentation-plan",
    marker: "presentation-plan",
  });
}

export function buildPresentationPlanSidecarText(args: {
  title?: string;
  filename?: string;
  summary?: string;
  plan: PresentationTaskPlan;
  exportedAt?: string;
}) {
  const payload: PresentationPlanSidecarPayload = {
    kind: PORTABLE_PRESENTATION_PLAN_KIND,
    version: "0.1",
    title: args.title,
    filename: args.filename,
    summary: args.summary,
    exportedAt: args.exportedAt || new Date().toISOString(),
    plan: args.plan,
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function parsePresentationPlanSidecarText(
  text?: string | null
): ParsedPresentationPlanSidecar | null {
  if (!text?.trim()) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (isPresentationTaskPlan(parsed)) {
    return { plan: parsed };
  }
  if (!parsed || typeof parsed !== "object") return null;
  const payload = parsed as Partial<PresentationPlanSidecarPayload>;
  if (payload.kind !== PORTABLE_PRESENTATION_PLAN_KIND) return null;
  if (!isPresentationTaskPlan(payload.plan)) return null;
  return {
    title: typeof payload.title === "string" ? payload.title : undefined,
    filename: typeof payload.filename === "string" ? payload.filename : undefined,
    summary: typeof payload.summary === "string" ? payload.summary : undefined,
    plan: payload.plan,
  };
}

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
