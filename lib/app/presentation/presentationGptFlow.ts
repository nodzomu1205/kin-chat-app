import { generateId } from "@/lib/shared/uuid";
import { parsePptCommand } from "@/lib/app/presentation/presentationCommandParser";
import {
  buildFramePresentationSpecFromTaskPlan,
  buildPresentationCommandLink,
  buildPresentationTaskStructuredInput,
  buildPresentationTaskPlan,
  formatPresentationTaskPlanText,
} from "@/lib/app/presentation/presentationTaskPlanning";
import { findPresentationPlanByDocumentId } from "@/lib/app/presentation/presentationPlanLibrary";
import {
  buildPresentationCommandFailureMessage,
  buildPresentationRenderedMessage,
} from "@/lib/app/presentation/presentationGptPrompts";
import {
  buildPresentationImageLibraryContext,
  getPresentationImageLibraryCandidates,
} from "@/lib/app/presentation/presentationImageLibrary";
import { renderFramePresentationPptx } from "@/lib/app/presentation/presentationRenderFlow";
import {
  applyPresentationVisualSelections,
  parsePresentationVisualSelectionCommand,
} from "@/lib/app/presentation/presentationVisualSelectionCommands";
import {
  mergePresentationPlanVisualSelections,
} from "@/lib/app/presentation/presentationVisualSelectionMerge";
import { buildPresentationVisualResolutionMessage } from "@/lib/app/presentation/presentationVisualResolutionMessage";
import { appendPresentationAssistantMessage } from "@/lib/app/presentation/presentationAssistantMessages";
import {
  findRecentPresentationPlanByDocumentId,
  hasUsablePresentationPlanShape,
  saveRecentPresentationPlanByDocumentId,
  updateExistingPresentationPlanFromRecent,
} from "@/lib/app/presentation/presentationRecentPlanStore";
import {
  buildPresentationTaskPlanTextWithImagePreviews,
} from "@/lib/app/presentation/presentationPlanChatDisplay";
import { requestGptAssistantArtifacts } from "@/lib/app/send-to-gpt/sendToGptFlowRequest";
import {
  applySendToGptRequestStart,
} from "@/lib/app/send-to-gpt/sendToGptFlowState";
import { runAutoUpdatePresentationTask } from "@/lib/app/gpt-task/gptTaskClient";
import type { SendToGptFlowStepArgs } from "@/lib/app/send-to-gpt/sendToGptFlowStepBuilders";
import type { Message } from "@/types/chat";
import type { PresentationTaskPlan } from "@/types/task";

export async function runPresentationGptCommandFlow(args: {
  rawText: string;
  flowArgs: SendToGptFlowStepArgs;
  assistantRequestArgs: Parameters<typeof requestGptAssistantArtifacts>[0];
}): Promise<boolean> {
  const command = parsePptCommand(args.rawText);
  if (!command.isPptCommand) return false;

  const userMessage: Message = {
    id: generateId(),
    role: "user",
    text: args.rawText,
  };
  applySendToGptRequestStart({
    userMessage,
    setGptMessages: args.flowArgs.setGptMessages,
    setGptInput: args.flowArgs.setGptInput,
    setGptLoading: args.flowArgs.setGptLoading,
  });

  try {
    if (command.intent === "renderPptx") {
      await runRenderPresentationPptxFlow({
        documentId: command.documentId,
        flowArgs: args.flowArgs,
      });
      return true;
    }

    if (command.intent === "savePlan") {
      appendPresentationAssistantMessage({
        flowArgs: args.flowArgs,
        text: buildPresentationSaveMessage({
          documentId: command.documentId,
          flowArgs: args.flowArgs,
        }),
      });
      return true;
    }

    if (command.intent === "resolveVisuals") {
      await runResolvePresentationVisualsFlow({
        documentId: command.documentId,
        body: command.body,
        flowArgs: args.flowArgs,
      });
      return true;
    }

    if (command.documentId && command.body.trim()) {
      await runUpdateSavedPresentationPlanFlow({
        documentId: command.documentId,
        body: command.body,
        flowArgs: args.flowArgs,
      });
      return true;
    }

    if (!command.intent) {
      appendPresentationAssistantMessage({
        flowArgs: args.flowArgs,
        text: [
          "PPT design creation now runs through the task design flow.",
          "",
          "Use the task controls to create or update a PPT design document, then run:",
          "/ppt",
          "Document ID: ppt_...",
          "Create PPT",
        ].join("\n"),
      });
      return true;
    }

    return true;
  } catch (error) {
    appendPresentationAssistantMessage({
      flowArgs: args.flowArgs,
      text: buildPresentationCommandFailureMessage({
        action: "renderPptx",
        error,
      }),
    });
    return true;
  } finally {
    args.flowArgs.setGptLoading(false);
  }
}

async function runRenderPresentationPptxFlow(args: {
  documentId?: string;
  flowArgs: SendToGptFlowStepArgs;
}) {
  if (!args.documentId) {
    throw new Error("Document ID is required for PPTX rendering.");
  }

  const existingPlan = findPresentationPlanByDocumentId({
    documentId: args.documentId,
    referenceLibraryItems: args.flowArgs.referenceLibraryItems,
  });
  const recentPlan = findRecentPresentationPlanByDocumentId({
    documentId: args.documentId,
    messages: args.flowArgs.gptStateRef.current.recentMessages || [],
  });
  const planSource =
    existingPlan
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
  if (planSource) {
    const frameSpec = buildFramePresentationSpecFromTaskPlan(planSource.plan);
    if (!frameSpec) {
      throw new Error(`Presentation plan is not renderable: ${args.documentId}`);
    }
    const output = await renderFramePresentationPptx({
      documentId: args.documentId,
      frameSpec,
      flowArgs: args.flowArgs,
    });
    const updatedPlan = {
      ...planSource.plan,
      latestPptx: output,
      updatedAt: new Date().toISOString(),
    };
    args.flowArgs.updateStoredDocument(planSource.sourceId, {
      title: planSource.item.title,
      text: formatPresentationTaskPlanText(updatedPlan),
      structuredPayload: updatedPlan,
      summary: planSource.item.summary,
    });
    appendPresentationAssistantMessage({
      flowArgs: args.flowArgs,
      text: buildPresentationRenderedMessage({
        documentId: args.documentId,
        title: updatedPlan.title,
        slideCount: output.slideCount,
        outputPath: output.path || "",
        filename: output.filename,
      }),
    });
    return;
  }

  throw new Error(`Presentation plan document not found: ${args.documentId}`);
}

async function runUpdateSavedPresentationPlanFlow(args: {
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

async function runResolvePresentationVisualsFlow(args: {
  documentId?: string;
  body: string;
  flowArgs: SendToGptFlowStepArgs;
}) {
  const selections = parsePresentationVisualSelectionCommand(args.body);
  if (selections.length === 0) {
    appendPresentationAssistantMessage({
      flowArgs: args.flowArgs,
      text: await buildPresentationVisualResolutionMessage({
        documentId: args.documentId,
        flowArgs: args.flowArgs,
      }),
    });
    return;
  }
  if (!args.documentId) {
    throw new Error("Document ID is required to resolve PPT visuals.");
  }
  const foundPlan = findPresentationPlanByDocumentId({
    documentId: args.documentId,
    referenceLibraryItems: args.flowArgs.referenceLibraryItems,
  });
  if (!foundPlan) {
    throw new Error(`Presentation plan document not found: ${args.documentId}`);
  }
  const updatedPlan = applyPresentationVisualSelections(foundPlan.plan, selections);
  args.flowArgs.updateStoredDocument(foundPlan.sourceId, {
    title: foundPlan.item.title,
    text: formatPresentationTaskPlanText(updatedPlan),
    structuredPayload: updatedPlan,
    summary: foundPlan.item.summary,
  });
  appendPresentationAssistantMessage({
    flowArgs: args.flowArgs,
    text: [
      "Presentation visual selections updated.",
      "",
      `Document ID: ${args.documentId}`,
      "",
      await buildPresentationTaskPlanTextWithImagePreviews(updatedPlan),
    ].join("\n"),
    presentationPlan: updatedPlan,
  });
}

function buildPresentationSaveMessage(args: {
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
