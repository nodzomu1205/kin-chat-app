import { generateId } from "@/lib/shared/uuid";
import { parsePptCommand } from "@/lib/app/presentation/presentationCommandParser";
import {
  buildPresentationTaskPlan,
  buildFramePresentationSpecFromTaskPlan,
  buildPresentationCommandLink,
  buildPresentationTaskStructuredInput,
  buildPresentationTaskPlanFromText,
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
import {
  collectFrameSpecPreferredImageIds,
  hydratePresentationLibraryImageAssets,
} from "@/lib/app/presentation/presentationRenderImages";
import {
  createPresentationBlobUrl,
  renderPresentationPptx,
} from "@/lib/app/presentation/presentationRenderClient";
import { resolvePresentationVisualSlots } from "@/lib/app/presentation/presentationVisualSelection";
import {
  applyPresentationVisualSelections,
  parsePresentationVisualSelectionCommand,
  visualResolutionSlots,
} from "@/lib/app/presentation/presentationVisualSelectionCommands";
import {
  mergePresentationPlanVisualSelections,
  mergeVisualSelectionProposal,
} from "@/lib/app/presentation/presentationVisualSelectionMerge";
import { requestPresentationVisualSlotNormalizationResult } from "@/lib/app/presentation/presentationVisualNormalization";
import {
  buildPresentationTaskPlanTextWithImagePreviews,
} from "@/lib/app/presentation/presentationPlanChatDisplay";
import { loadGeneratedImageAsset } from "@/lib/app/image/imageAssetStorage";
import { normalizeImageGenerationUsage } from "@/lib/app/image/imageDisplayText";
import { requestGptAssistantArtifacts } from "@/lib/app/send-to-gpt/sendToGptFlowRequest";
import {
  applySendToGptRequestStart,
} from "@/lib/app/send-to-gpt/sendToGptFlowState";
import { runAutoUpdatePresentationTask } from "@/lib/app/gpt-task/gptTaskClient";
import type { SendToGptFlowStepArgs } from "@/lib/app/send-to-gpt/sendToGptFlowStepBuilders";
import type { Message } from "@/types/chat";
import type { PresentationTaskPlan, PresentationTaskSlideFrame } from "@/types/task";

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
    const selectedImageIds = collectFrameSpecPreferredImageIds(frameSpec);
    const shouldHydrateLibraryImages = selectedImageIds.size > 0;
    const output = await renderPresentationPptx({
      documentId: args.documentId,
      frameSpec,
      generateImages: shouldHydrateLibraryImages,
      imageMode: selectedImageIds.size > 0 ? "library" : undefined,
      libraryImageAssets: await hydratePresentationLibraryImageAssets({
        flowArgs: args.flowArgs,
        frameSpec,
        onlyRequiredImageAssets: true,
      }),
    });
    applyGeneratedImageUsage(
      output.generatedImages,
      args.flowArgs.applyImageUsage
    );
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

function applyGeneratedImageUsage(
  generatedImages: Array<{
    usage?: import("@/lib/server/presentation/imageGeneration").ImageGenerationUsage;
  }> | undefined,
  applyImageUsage?: SendToGptFlowStepArgs["applyImageUsage"]
) {
  for (const image of generatedImages || []) {
    const usage = normalizeImageGenerationUsage(image.usage);
    if (usage) applyImageUsage?.(usage);
  }
}

function appendPresentationAssistantMessage(args: {
  flowArgs: SendToGptFlowStepArgs;
  text: string;
  presentationPlan?: PresentationTaskPlan;
}) {
  const message = createPresentationAssistantMessage({
    text: args.text,
    presentationPlan: args.presentationPlan,
  });
  appendPresentationAssistantMessageToSetter({
    setGptMessages: args.flowArgs.setGptMessages,
    message,
  });
  const currentRecent = args.flowArgs.gptStateRef.current.recentMessages || [];
  const recentLimit = args.flowArgs.chatRecentLimit || 20;
  args.flowArgs.gptStateRef.current = {
    ...args.flowArgs.gptStateRef.current,
    recentMessages: [...currentRecent, message].slice(-recentLimit),
  };
}

function appendPresentationAssistantMessageToSetter(args: {
  setGptMessages: SendToGptFlowStepArgs["setGptMessages"];
  message: Message;
}) {
  args.setGptMessages((prev) => [...prev, args.message]);
}

function createPresentationAssistantMessage(args: {
  text: string;
  presentationPlan?: PresentationTaskPlan;
}): Message {
  return {
    id: generateId(),
    role: "gpt",
    text: args.text,
    meta: args.presentationPlan
      ? {
          kind: "task_info",
          sourceType: "manual",
          presentationPlan: args.presentationPlan,
        }
      : undefined,
  };
}

function saveRecentPresentationPlanByDocumentId(args: {
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

function findRecentPresentationPlanByDocumentId(args: {
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

function hasUsablePresentationPlanShape(plan: PresentationTaskPlan) {
  return plan.slideFrames.length > 0;
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

function updateExistingPresentationPlanFromRecent(args: {
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

async function buildPresentationVisualResolutionMessage(args: {
  documentId?: string;
  flowArgs: SendToGptFlowStepArgs;
}) {
  if (!args.documentId) return "Document ID is required to resolve PPT visuals.";
  const foundPlan = findPresentationPlanByDocumentId({
    documentId: args.documentId,
    referenceLibraryItems: args.flowArgs.referenceLibraryItems,
  });
  if (!foundPlan) {
    return `Presentation plan document not found: ${args.documentId}`;
  }

  const imageCandidates = getPresentationImageLibraryCandidates({
    enabled: args.flowArgs.imageLibraryReferenceEnabled,
    count: args.flowArgs.imageLibraryReferenceCount,
    referenceLibraryItems: args.flowArgs.referenceLibraryItems,
  });
  const shouldResolveUnselectedSlots =
    imageCandidates.length > 0 && hasUnresolvedPresentationVisualSlots(foundPlan.plan);
  const normalizationResult =
    shouldResolveUnselectedSlots
      ? await requestPresentationVisualSlotNormalizationResult(foundPlan.plan)
      : { normalized: {} };
  if (normalizationResult.usage) {
    args.flowArgs.applyTaskUsage?.(normalizationResult.usage);
  }
  const proposedPlan = shouldResolveUnselectedSlots
    ? resolvePresentationVisualSlots({
        plan: foundPlan.plan,
        imageCandidates,
        normalizedSlotTexts: normalizationResult.normalized,
      })
    : foundPlan.plan;
  const lines = [
    "Resolve visual blocks.",
    "",
    `Document ID: ${args.documentId}`,
  ];

  const proposedOpening = proposedPlan.deckFrame?.openingSlide;
  const currentOpening = foundPlan.plan.deckFrame?.openingSlide;
  if (
    proposedOpening?.enabled &&
    proposedOpening.frameId === "visualTitleCover" &&
    proposedOpening.visualRequest
  ) {
    const visual = mergeVisualSelectionProposal(
      currentOpening?.visualRequest,
      proposedOpening.visualRequest
    );
    await appendVisualSlotResolutionLines(lines, {
      address: "Opening slide / visual",
      documentId: args.documentId,
      visual,
    });
  }
  for (const frame of proposedPlan.slideFrames) {
    for (const [index, block] of frame.blocks.entries()) {
      const currentFrame = foundPlan.plan.slideFrames.find(
        (item) => item.slideNumber === frame.slideNumber
      );
      const currentBlock = currentFrame?.blocks[index];
      if (!block.visualRequest) continue;
      const displayBlock = {
        ...block,
        visualRequest: mergeVisualSelectionProposal(
          currentBlock?.visualRequest,
          block.visualRequest
        ),
      };
      const visual = displayBlock.visualRequest;
      if (!visual) continue;
      const blockNumber = index + 1;
      await appendVisualSlotResolutionLines(lines, {
        address: `Slide ${frame.slideNumber} / block ${blockNumber}`,
        documentId: args.documentId,
        visual,
      });
    }
  }
  return lines.join("\n");
}

async function appendVisualSlotResolutionLines(
  lines: string[],
  args: {
    address: string;
    documentId: string;
    visual: NonNullable<PresentationTaskSlideFrame["blocks"][number]["visualRequest"]>;
  }
) {
  const slots = visualResolutionSlots(args.visual);
  for (const [index, slot] of slots.entries()) {
    const slotNumber = index + 1;
    const address = `${args.address} / slot ${slotNumber}`;
    const match = visualMatchForSlot(args.visual, slot, index);
    lines.push(
      "",
      `${address}:`,
      `ビジュアルプロンプト: ${slot.need || args.visual.prompt || args.visual.brief}`,
      `ビジュアル内表示ラベル: ${slot.label || args.visual.labels?.[0] || args.visual.brief || "未設定"}`
    );
    const isCurrentSelection =
      match?.status === "selected" && match.score === 1 && match.threshold === 1;
    lines.push(isCurrentSelection ? "現在選択中の画像:" : "自動マッチ画像を選択:");
    const target = match?.imageId
      ? `${match.imageId}${match.imageTitle ? ` (${match.imageTitle})` : ""}`
      : "候補なし";
    lines.push(`- ${target} / score ${match?.score || 0} / threshold ${match?.threshold || 5}`);
    const imagePath = match?.imageId
      ? await createPresentationImagePreviewUrl(match.imageId)
      : "";
    if (imagePath) {
      lines.push(`![${match?.imageId}](${imagePath})`);
    }
    if (match?.imageId) {
      lines.push(
        buildPresentationCommandLink("この候補を入力欄にセット", [
          "/ppt",
          `Document ID: ${args.documentId}`,
          "Resolve visuals",
          `${address}: ${match.imageId}`,
        ])
      );
    }
    lines.push(
      buildPresentationCommandLink("ライブラリから選択", [
        "/ppt",
        `Document ID: ${args.documentId}`,
        "Resolve visuals",
        `${address}: `,
      ])
    );
  }
}

function visualMatchForSlot(
  visual: NonNullable<PresentationTaskSlideFrame["blocks"][number]["visualRequest"]>,
  slot: ReturnType<typeof visualResolutionSlots>[number],
  slotIndex: number
) {
  const match = (visual.selectionMatches || []).find((item) => item.slotId === slot.slotId);
  if (match) return match;
  const selectedIds = Array.from(
    new Set([visual.preferredImageId, ...(visual.candidateImageIds || [])].filter(Boolean))
  );
  const fallbackImageId = selectedIds[slotIndex] || (slotIndex === 0 ? selectedIds[0] : "");
  if (fallbackImageId) {
    return {
      slotId: slot.slotId,
      label: slot.label || visual.labels?.[slotIndex] || visual.brief || "Visual",
      need: slot.need || visual.prompt || visual.brief || "Visual",
      status: "selected" as const,
      imageId: fallbackImageId,
      score: 1,
      threshold: 1,
    };
  }
  return null;
}

function hasUnresolvedPresentationVisualSlots(plan: PresentationTaskPlan) {
  const openingVisual = plan.deckFrame?.openingSlide?.visualRequest;
  if (openingVisual && !isPresentationVisualFullySelected(openingVisual)) {
    return true;
  }
  for (const frame of plan.slideFrames) {
    for (const block of frame.blocks) {
      if (block.visualRequest && !isPresentationVisualFullySelected(block.visualRequest)) {
        return true;
      }
    }
  }
  return false;
}

function isPresentationVisualFullySelected(
  visual: NonNullable<PresentationTaskSlideFrame["blocks"][number]["visualRequest"]>
) {
  return visualResolutionSlots(visual).every((slot, index) => {
    const match = visualMatchForSlot(visual, slot, index);
    return match?.status === "selected" && !!match.imageId;
  });
}

async function createPresentationImagePreviewUrl(imageId: string) {
  const asset = await loadGeneratedImageAsset(imageId);
  if (!asset?.base64) return "";
  return createPresentationBlobUrl({
    contentBase64: asset.base64,
    mimeType: asset.mimeType,
  }) || "";
}
