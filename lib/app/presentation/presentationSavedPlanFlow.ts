import {
  buildPresentationCommandLink,
  buildPresentationTaskPlan,
  buildPresentationTaskStructuredInput,
  formatPresentationTaskPlanText,
} from "@/lib/app/presentation/presentationTaskPlanning";
import { findPresentationPlanByDocumentId } from "@/lib/app/presentation/presentationPlanLibrary";
import {
  buildPresentationImageLibraryContext,
  getPresentationImageLibraryCandidates,
} from "@/lib/app/presentation/presentationImageLibrary";
import { buildPresentationTaskPlanTextWithImagePreviews } from "@/lib/app/presentation/presentationPlanChatDisplay";
import { mergePresentationPlanVisualSelections } from "@/lib/app/presentation/presentationVisualSelectionMerge";
import { appendPresentationAssistantMessage } from "@/lib/app/presentation/presentationAssistantMessages";
import {
  findRecentPresentationPlanByDocumentId,
  hasUsablePresentationPlanShape,
  saveRecentPresentationPlanByDocumentId,
  updateExistingPresentationPlanFromRecent,
} from "@/lib/app/presentation/presentationRecentPlanStore";
import { runAutoUpdatePresentationTask } from "@/lib/app/gpt-task/gptTaskClient";
import type { SendToGptFlowStepArgs } from "@/lib/app/send-to-gpt/sendToGptFlowStepBuilders";
import type { PresentationTaskPlan } from "@/types/task";

export async function runUpdateSavedPresentationPlanFlow(args: {
  documentId: string;
  body: string;
  flowArgs: SendToGptFlowStepArgs;
}) {
  const foundPlan = findPresentationPlanByDocumentId({
    documentId: args.documentId,
    referenceLibraryItems: args.flowArgs.referenceLibraryItems,
  });
  if (!foundPlan) {
    throw new Error(`Presentation plan document not found: ${args.documentId}`);
  }

  const imageCandidates = getPresentationImageLibraryCandidates({
    enabled: args.flowArgs.imageLibraryReferenceEnabled,
    count: args.flowArgs.imageLibraryReferenceCount,
    referenceLibraryItems: args.flowArgs.referenceLibraryItems,
  });
  const input = buildPresentationTaskStructuredInput({
    title: foundPlan.plan.title || foundPlan.item.title || "PPT design",
    userInstruction: args.body.trim(),
    currentPlanText: formatPresentationTaskPlanText(foundPlan.plan),
    body: args.body,
    libraryReferenceContext: args.flowArgs.buildLibraryReferenceContext?.(),
    imageLibraryContext: buildPresentationImageLibraryContext(imageCandidates),
  });
  const data = await runAutoUpdatePresentationTask(input, "ppt-library-update");
  const incomingPlan: PresentationTaskPlan = {
    ...buildPresentationTaskPlan({
      title: foundPlan.plan.title || foundPlan.item.title || "PPT design",
      result: data?.parsed,
      rawText: data?.raw,
      generationDebug: data?.meta?.presentationPlan,
    }),
    documentId: foundPlan.plan.documentId,
  };
  if (!hasUsablePresentationPlanShape(incomingPlan)) {
    args.flowArgs.applyTaskUsage?.(data?.usage);
    appendPresentationAssistantMessage({
      flowArgs: args.flowArgs,
      text: [
        "Presentation design update could not be applied.",
        "",
        `Document ID: ${args.documentId}`,
        "",
        "The update result did not include slideFrames, so the existing saved design was preserved.",
        "",
        await buildPresentationTaskPlanTextWithImagePreviews(foundPlan.plan),
      ].join("\n"),
      presentationPlan: foundPlan.plan,
    });
    return;
  }
  const updatedPlan: PresentationTaskPlan = {
    ...mergePresentationPlanVisualSelections({
      incomingPlan,
      existingPlan: foundPlan.plan,
    }),
    latestPptx: foundPlan.plan.latestPptx || incomingPlan.latestPptx || null,
    updatedAt: new Date().toISOString(),
  };
  const text = formatPresentationTaskPlanText(updatedPlan);

  args.flowArgs.updateStoredDocument(foundPlan.sourceId, {
    title: foundPlan.item.title,
    text,
    structuredPayload: updatedPlan,
    summary: foundPlan.item.summary,
  });
  args.flowArgs.applyTaskUsage?.(data?.usage);
  appendPresentationAssistantMessage({
    flowArgs: args.flowArgs,
    text: [
      "Presentation design updated and saved in the library.",
      "",
      `Document ID: ${args.documentId}`,
      "",
      await buildPresentationTaskPlanTextWithImagePreviews(updatedPlan),
    ].join("\n"),
    presentationPlan: updatedPlan,
  });
}

export function buildPresentationSaveMessage(args: {
  documentId?: string;
  flowArgs: SendToGptFlowStepArgs;
}) {
  if (!args.documentId) return "Document ID is required to save a PPT design.";
  const recentPlan = findRecentPresentationPlanByDocumentId({
    documentId: args.documentId,
    messages: args.flowArgs.gptStateRef.current.recentMessages || [],
  });
  const existingPlan = findPresentationPlanByDocumentId({
    documentId: args.documentId,
    referenceLibraryItems: args.flowArgs.referenceLibraryItems,
  });
  const foundPlan = existingPlan
    ? updateExistingPresentationPlanFromRecent({
        existingPlan,
        recentPlan,
        flowArgs: args.flowArgs,
      })
    : recentPlan
      ? saveRecentPresentationPlanByDocumentId({
          documentId: args.documentId,
          flowArgs: args.flowArgs,
        })
      : null;
  if (!foundPlan) {
    return `Presentation plan document not found: ${args.documentId}`;
  }
  return [
    "Presentation design is saved in the library.",
    "",
    `Document ID: ${args.documentId}`,
    `Title: ${foundPlan.plan.title}`,
    "",
    buildPresentationCommandLink("Create PPT", [
      "/ppt",
      `Document ID: ${args.documentId}`,
      "Create PPT",
    ], "run"),
    buildPresentationCommandLink("Resolve visual blocks", [
      "/ppt",
      `Document ID: ${args.documentId}`,
      "Resolve visual blocks",
    ], "run"),
  ].join("\n");
}
