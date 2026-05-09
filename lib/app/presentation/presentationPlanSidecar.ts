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

export function buildPresentationPlanSidecarArtifact(args: {
  title?: string;
  filename?: string;
  summary?: string;
  plan: PresentationTaskPlan;
}) {
  return {
    fileName: buildPresentationPlanSidecarFileName({
      filename: args.filename,
      title: args.title,
    }),
    text: buildPresentationPlanSidecarText({
      title: args.title,
      filename: args.filename,
      summary: args.summary,
      plan: args.plan,
    }),
    mimeType: "application/json",
  };
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
