import {
  buildPresentationTaskPlanFromText,
  formatPresentationTaskPlanText,
} from "@/lib/app/presentation/presentationTaskPlanning";
import { findPresentationPlanByDocumentId } from "@/lib/app/presentation/presentationPlanLibrary";
import {
  mergePresentationPlanVisualSelections,
} from "@/lib/app/presentation/presentationVisualSelectionMerge";
import type { SendToGptFlowStepArgs } from "@/lib/app/send-to-gpt/sendToGptFlowStepBuilders";
import type { Message } from "@/types/chat";
import type { PresentationTaskPlan } from "@/types/task";

export function saveRecentPresentationPlanByDocumentId(args: {
  documentId: string;
  flowArgs: SendToGptFlowStepArgs;
}) {
  const recentPlan = findRecentPresentationPlanByDocumentId({
    documentId: args.documentId,
    messages: args.flowArgs.gptStateRef.current.recentMessages || [],
  });
  if (!recentPlan) return null;

  const text = formatPresentationTaskPlanText(recentPlan);
  const now = new Date().toISOString();
  const saved = args.flowArgs.recordIngestedDocument({
    artifactType: "presentation_plan",
    title: recentPlan.title || "PPT design",
    filename: `${args.documentId}.txt`,
    text,
    summary: recentPlan.sourceSummary,
    taskId: args.flowArgs.currentTaskId || undefined,
    charCount: text.length,
    structuredPayload: recentPlan,
    createdAt: now,
    updatedAt: now,
  });

  return {
    plan: recentPlan,
    item: {
      id: saved.id,
      sourceId: saved.id,
      itemType: "ingested_file" as const,
      title: recentPlan.title || "PPT design",
      subtitle: `Document ID: ${args.documentId}`,
      summary: recentPlan.sourceSummary || "",
      excerptText: text,
      createdAt: now,
      updatedAt: now,
      filename: `${args.documentId}.txt`,
      artifactType: "presentation_plan" as const,
      structuredPayload: recentPlan,
    },
    sourceId: saved.id,
  };
}

export function findRecentPresentationPlanByDocumentId(args: {
  documentId: string;
  messages: Message[];
}): PresentationTaskPlan | null {
  for (const message of args.messages.slice().reverse()) {
    if (
      message.meta?.presentationPlan?.documentId === args.documentId &&
      hasUsablePresentationPlanShape(message.meta.presentationPlan)
    ) {
      return message.meta.presentationPlan;
    }
    const text = message.text || "";
    if (!text.includes(args.documentId) || !text.includes("【PPT設計書】")) continue;
    const plan = buildPresentationTaskPlanFromText({
      title: "PPT design",
      text,
      updatedAt: new Date().toISOString(),
    });
    if (plan.documentId === args.documentId && hasUsablePresentationPlanShape(plan)) {
      return plan;
    }
  }
  return null;
}

export function hasUsablePresentationPlanShape(plan: PresentationTaskPlan) {
  return plan.slideFrames.length > 0;
}

export function updateExistingPresentationPlanFromRecent(args: {
  existingPlan: NonNullable<ReturnType<typeof findPresentationPlanByDocumentId>>;
  recentPlan: PresentationTaskPlan | null;
  flowArgs: SendToGptFlowStepArgs;
}) {
  const plan = args.recentPlan
    ? {
        ...mergePresentationPlanVisualSelections({
          incomingPlan: args.recentPlan,
          existingPlan: args.existingPlan.plan,
        }),
        latestPptx: args.existingPlan.plan.latestPptx || args.recentPlan.latestPptx || null,
        updatedAt: new Date().toISOString(),
      }
    : args.existingPlan.plan;
  if (args.recentPlan) {
    args.flowArgs.updateStoredDocument(args.existingPlan.sourceId, {
      title: args.existingPlan.item.title,
      text: formatPresentationTaskPlanText(plan),
      structuredPayload: plan,
      summary: args.existingPlan.item.summary,
    });
  }
  return {
    ...args.existingPlan,
    plan,
  };
}
