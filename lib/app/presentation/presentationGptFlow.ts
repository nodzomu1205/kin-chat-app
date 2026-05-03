import { generateId } from "@/lib/shared/uuid";
import {
  parsePptCommand,
  parsePptFrameCommand,
} from "@/lib/app/presentation/presentationCommandParser";
import {
  buildFramePresentationSpecFromTaskPlan,
  formatPresentationTaskPlanText,
} from "@/lib/app/presentation/presentationTaskPlanning";
import { findPresentationPlanByDocumentId } from "@/lib/app/presentation/presentationPlanLibrary";
import {
  buildPresentationCommandFailureMessage,
  buildPresentationRevisedMessage,
  buildPresentationRenderedMessage,
} from "@/lib/app/presentation/presentationGptPrompts";
import {
  buildPresentationImageLibraryContext,
  getPresentationImageLibraryCandidates,
} from "@/lib/app/presentation/presentationImageLibrary";
import {
  buildPresentationFrameIndexText,
  buildPresentationFrameJsonText,
} from "@/lib/app/presentation/presentationFrameRegistry";
import { loadGeneratedImageAsset } from "@/lib/app/image/imageAssetStorage";
import { normalizeImageGenerationUsage } from "@/lib/app/image/imageDisplayText";
import { requestGptAssistantArtifacts } from "@/lib/app/send-to-gpt/sendToGptFlowRequest";
import {
  applySendToGptRequestStart,
} from "@/lib/app/send-to-gpt/sendToGptFlowState";
import {
  runInterpretPresentationDirectEdit,
  type PresentationDirectEditInterpretation,
} from "@/lib/app/gpt-task/gptTaskClient";
import {
  findApprovedPptDirectEdit,
  findPendingPptDirectEditCandidate,
  buildPptDirectEditTargetSummary,
  savePendingPptDirectEditCandidate,
  type PptDirectEditBlockEdit,
  type PptDirectEditCandidate,
} from "@/lib/app/presentation/presentationDirectEditApproval";
import type { SendToGptFlowStepArgs } from "@/lib/app/send-to-gpt/sendToGptFlowStepBuilders";
import type { Message } from "@/types/chat";
import type { PresentationTaskSlideFrame } from "@/types/task";

export async function runPresentationGptCommandFlow(args: {
  rawText: string;
  flowArgs: SendToGptFlowStepArgs;
  assistantRequestArgs: Parameters<typeof requestGptAssistantArtifacts>[0];
}): Promise<boolean> {
  const frameCommand = parsePptFrameCommand(args.rawText);
  if (frameCommand.isFrameCommand) {
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
    appendPresentationAssistantMessage({
      flowArgs: args.flowArgs,
      text: buildPresentationFrameCommandResponse(frameCommand),
    });
    args.flowArgs.setGptLoading(false);
    return true;
  }

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
        generateImages: command.generateImages,
        imageMode: command.imageMode,
        flowArgs: args.flowArgs,
      });
      return true;
    }

    if (command.intent === "reviseRenderedPptx") {
      await runReviseRenderedPresentationPptxFlow({
        documentId: command.documentId,
        instruction: command.body,
        generateImages: command.generateImages,
        imageMode: command.imageMode,
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

    appendPresentationAssistantMessage({
      flowArgs: args.flowArgs,
      text: command.documentId
        ? buildPresentationPreviewMessage({
            documentId: command.documentId,
            flowArgs: args.flowArgs,
          })
        : "Please include Document ID for this presentation command.",
    });
    return true;
  } catch (error) {
    appendPresentationAssistantMessage({
      flowArgs: args.flowArgs,
      text: buildPresentationCommandFailureMessage({
        action:
          command.intent === "reviseRenderedPptx"
            ? "reviseRenderedPptx"
            : "renderPptx",
        error,
      }),
    });
    return true;
  } finally {
    args.flowArgs.setGptLoading(false);
  }
}

function buildPresentationFrameCommandResponse(
  command: ReturnType<typeof parsePptFrameCommand>
) {
  if (command.intent === "showFrameIndex") {
    return buildPresentationFrameIndexText();
  }

  if (command.intent === "showFrameJson" && command.frameId) {
    return buildPresentationFrameJsonText(command.frameId);
  }

  return [
    "Unsupported PPT frame command.",
    "",
    "Supported commands:",
    "- PPT frames: Show index",
    "- PPT frames: Show JSON / <frameId>",
  ].join("\n");
}

async function runRenderPresentationPptxFlow(args: {
  documentId?: string;
  generateImages?: boolean;
  imageMode?: ReturnType<typeof parsePptCommand>["imageMode"];
  flowArgs: SendToGptFlowStepArgs;
}) {
  if (!args.documentId) {
    throw new Error("Document ID is required for PPTX rendering.");
  }

  const foundPlan = findPresentationPlanByDocumentId({
    documentId: args.documentId,
    referenceLibraryItems: args.flowArgs.referenceLibraryItems,
  });
  if (foundPlan) {
    const frameSpec = buildFramePresentationSpecFromTaskPlan(foundPlan.plan);
    if (!frameSpec) {
      throw new Error(`Presentation plan is not renderable: ${args.documentId}`);
    }
    const output = await renderPresentationPptx({
      documentId: args.documentId,
      frameSpec,
      generateImages: args.generateImages,
      imageMode: args.imageMode,
      libraryImageAssets: await hydratePresentationLibraryImageAssets({
        flowArgs: args.flowArgs,
        frameSpec,
      }),
    });
    applyGeneratedImageUsage(
      output.generatedImages,
      args.flowArgs.applyImageUsage
    );
    const updatedPlan = {
      ...foundPlan.plan,
      slideFrames: Array.isArray(output.frameSpec?.slideFrames)
        ? output.frameSpec.slideFrames
        : foundPlan.plan.slideFrames,
      latestPptx: output,
      updatedAt: new Date().toISOString(),
    };
    args.flowArgs.updateStoredDocument(foundPlan.sourceId, {
      title: foundPlan.item.title,
      text: formatPresentationTaskPlanText(updatedPlan),
      structuredPayload: updatedPlan,
      summary: foundPlan.item.summary,
    });
    appendPresentationAssistantMessage({
      flowArgs: args.flowArgs,
      text: buildPresentationRenderedMessage({
        documentId: args.documentId,
        title: updatedPlan.title,
        slideCount: output.slideCount,
        outputPath: output.path || "",
        filename: output.filename,
        generatedImages: output.generatedImages,
      }),
    });
    return;
  }

  throw new Error(`Presentation plan document not found: ${args.documentId}`);
}

async function runReviseRenderedPresentationPptxFlow(args: {
  documentId?: string;
  instruction: string;
  generateImages?: boolean;
  imageMode?: ReturnType<typeof parsePptCommand>["imageMode"];
  flowArgs: SendToGptFlowStepArgs;
}) {
  if (!args.documentId) {
    throw new Error("Document ID is required for PPTX revision.");
  }
  const instruction = args.instruction.trim();
  if (!instruction) {
    throw new Error("Revision instruction is required.");
  }

  const foundPlan = findPresentationPlanByDocumentId({
    documentId: args.documentId,
    referenceLibraryItems: args.flowArgs.referenceLibraryItems,
  });
  if (!foundPlan) {
    throw new Error(`Presentation plan document not found: ${args.documentId}`);
  }

  const currentFrameSpec = buildFramePresentationSpecFromTaskPlan(foundPlan.plan);
  const storage = typeof window === "undefined" ? null : window.localStorage;
  const approvedEdit = findApprovedPptDirectEdit({
    storage,
    documentId: args.documentId,
    instruction,
  });
  if (approvedEdit) {
    await applyPptDirectEditCandidate({
      candidate: approvedEdit,
      referenceLibraryItems: args.flowArgs.referenceLibraryItems,
      imageLibraryReferenceEnabled: args.flowArgs.imageLibraryReferenceEnabled,
      imageLibraryReferenceCount: args.flowArgs.imageLibraryReferenceCount,
      updateStoredDocument: args.flowArgs.updateStoredDocument,
      setGptMessages: args.flowArgs.setGptMessages,
      applyImageUsage: args.flowArgs.applyImageUsage,
      generateImages: args.generateImages ?? true,
      imageMode: args.imageMode ?? "hybrid",
    });
    return;
  }

  const pendingEdit = findPendingPptDirectEditCandidate({
    storage,
    documentId: args.documentId,
    instruction,
  });
  if (pendingEdit) {
    appendPresentationAssistantMessage({
      flowArgs: args.flowArgs,
      text: [
        "PPT direct edit is waiting for approval.",
        "",
        `Document ID: ${args.documentId}`,
        `Candidate ID: ${pendingEdit.id}`,
      ].join("\n"),
    });
    return;
  }

  const imageLibraryContext = buildPresentationImageLibraryContext(
    getPresentationImageLibraryCandidates({
      enabled: args.flowArgs.imageLibraryReferenceEnabled,
      count: args.flowArgs.imageLibraryReferenceCount,
      referenceLibraryItems: args.flowArgs.referenceLibraryItems,
      requiredImageIds: collectFrameSpecPreferredImageIds(currentFrameSpec),
    })
  );
  const input = buildPptDirectEditStructuredInput({
    documentId: args.documentId,
    plan: foundPlan.plan,
    instruction,
    imageLibraryContext,
  });
  const data = await runInterpretPresentationDirectEdit(
    input,
    "pptx-direct-edit"
  );
  if (data?.usage) args.flowArgs.applyTaskUsage?.(data.usage);

  const edits = buildPptDirectEditBlockEdits({
    documentId: args.documentId,
    plan: foundPlan.plan,
    instruction,
    interpretation: data.directEdit,
  });
  if (edits.length === 0) {
    throw new Error(
      data.directEdit?.missingInfo?.join(" / ") ||
        "Could not identify an actionable PPT direct edit candidate."
    );
  }
  const targetSummary = buildPptDirectEditTargetSummary(edits);
  savePendingPptDirectEditCandidate({
    storage,
    candidate: {
      id: `ppt-edit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      documentId: args.documentId,
      instruction,
      targetSummary,
      changeSummary: instruction,
      edits,
      planText: "",
      plan: {
        ...foundPlan.plan,
        latestPptx: foundPlan.plan.latestPptx ?? null,
        updatedAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });
  appendPresentationAssistantMessage({
    flowArgs: args.flowArgs,
    text: [
      "PPT direct edit interpretation is ready for approval.",
      "",
      `Document ID: ${args.documentId}`,
      "Open Library settings and approve the pending PPT direct edit item.",
    ].join("\n"),
  });
}

export async function applyPptDirectEditCandidate(args: {
  candidate: Pick<PptDirectEditCandidate, "documentId" | "plan">;
  referenceLibraryItems: Parameters<typeof findPresentationPlanByDocumentId>[0]["referenceLibraryItems"];
  imageLibraryReferenceEnabled?: boolean;
  imageLibraryReferenceCount?: number;
  updateStoredDocument: SendToGptFlowStepArgs["updateStoredDocument"];
  setGptMessages: SendToGptFlowStepArgs["setGptMessages"];
  applyImageUsage?: SendToGptFlowStepArgs["applyImageUsage"];
  generateImages?: boolean;
  imageMode?: ReturnType<typeof parsePptCommand>["imageMode"];
}) {
  const foundPlan = findPresentationPlanByDocumentId({
    documentId: args.candidate.documentId,
    referenceLibraryItems: args.referenceLibraryItems,
  });
  if (!foundPlan) {
    throw new Error(
      `Presentation plan document not found: ${args.candidate.documentId}`
    );
  }
  const syncedPlan = {
    ...args.candidate.plan,
    documentId: args.candidate.documentId,
    latestPptx: foundPlan.plan.latestPptx ?? null,
    updatedAt: new Date().toISOString(),
  };
  const frameSpec = buildFramePresentationSpecFromTaskPlan(syncedPlan);
  if (!frameSpec) {
    throw new Error(
      `Revised presentation plan is not renderable: ${args.candidate.documentId}`
    );
  }

  const output = await renderPresentationPptx({
    documentId: args.candidate.documentId,
    frameSpec,
    generateImages: args.generateImages ?? true,
    imageMode: args.imageMode ?? "hybrid",
    libraryImageAssets: await hydratePresentationLibraryImageAssets({
      referenceLibraryItems: args.referenceLibraryItems,
      imageLibraryReferenceEnabled: args.imageLibraryReferenceEnabled,
      imageLibraryReferenceCount: args.imageLibraryReferenceCount,
      frameSpec,
    }),
  });
  applyGeneratedImageUsage(output.generatedImages, args.applyImageUsage);
  const updatedPlan = {
    ...syncedPlan,
    slideFrames: Array.isArray(output.frameSpec?.slideFrames)
      ? output.frameSpec.slideFrames
      : syncedPlan.slideFrames,
    latestPptx: output,
    updatedAt: new Date().toISOString(),
  };

  args.updateStoredDocument(foundPlan.sourceId, {
    title: foundPlan.item.title,
    text: formatPresentationTaskPlanText(updatedPlan),
    structuredPayload: updatedPlan,
    summary: foundPlan.item.summary,
  });
  appendPresentationAssistantMessageToSetter({
    setGptMessages: args.setGptMessages,
    text: buildPresentationRevisedMessage({
      documentId: args.candidate.documentId,
      title: updatedPlan.title,
      slideCount: output.slideCount,
      outputPath: output.path || "",
      filename: output.filename,
    }),
  });
}

async function renderPresentationPptx(args: {
  documentId: string;
  spec?: unknown;
  frameSpec?: unknown;
  generateImages?: boolean;
  imageMode?: ReturnType<typeof parsePptCommand>["imageMode"];
  libraryImageAssets?: PresentationRenderLibraryImageAsset[];
}) {
  const res = await fetch("/api/presentation-render", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  const data = (await res.json().catch(() => ({}))) as {
    output?: {
      id?: string;
      format?: "pptx";
      filename?: string;
      path?: string;
      contentBase64?: string;
      mimeType?: string;
      createdAt?: string;
      slideCount?: number;
      generatedImages?: Array<{
        imageId?: string;
        title?: string;
        prompt?: string;
        mimeType?: string;
        contentBase64?: string;
        usage?: import("@/lib/server/presentation/imageGeneration").ImageGenerationUsage;
      }>;
      frameSpec?: {
        slideFrames?: PresentationTaskSlideFrame[];
      };
    };
    error?: unknown;
  };

  if (!res.ok || !data.output) {
    throw new Error(
      typeof data.error === "string" && data.error.trim()
        ? data.error.trim()
        : "Presentation render failed."
    );
  }

  return {
    id: data.output.id || `pptx_${Date.now()}`,
    format: "pptx" as const,
    filename: data.output.filename || `${args.documentId}.pptx`,
    path:
      data.output.path ||
      createPresentationBlobUrl({
        contentBase64: data.output.contentBase64,
        mimeType: data.output.mimeType,
      }) ||
      "",
    createdAt: data.output.createdAt || new Date().toISOString(),
    slideCount: data.output.slideCount || 0,
    generatedImages: (data.output.generatedImages || []).map((image) => ({
      imageId: image.imageId || "",
      title: image.title || "",
      prompt: image.prompt || "",
      path: createPresentationBlobUrl({
        contentBase64: image.contentBase64,
        mimeType: image.mimeType,
      }) || "",
      usage: image.usage,
    })),
    frameSpec: data.output.frameSpec,
  };
}

type PresentationRenderLibraryImageAsset = {
  imageId: string;
  title?: string;
  fileName?: string;
  mimeType: string;
  base64: string;
  description?: string;
  prompt?: string;
  originalPrompt?: string;
  widthPx?: number;
  heightPx?: number;
  aspectRatio?: number;
  orientation?: "landscape" | "portrait" | "square" | "unknown";
};

async function hydratePresentationLibraryImageAssets(args: {
  flowArgs?: SendToGptFlowStepArgs;
  referenceLibraryItems?: SendToGptFlowStepArgs["referenceLibraryItems"];
  imageLibraryReferenceEnabled?: boolean;
  imageLibraryReferenceCount?: number;
  frameSpec?: ReturnType<typeof buildFramePresentationSpecFromTaskPlan>;
}): Promise<PresentationRenderLibraryImageAsset[]> {
  const candidates = getPresentationImageLibraryCandidates({
    enabled:
      args.imageLibraryReferenceEnabled ??
      args.flowArgs?.imageLibraryReferenceEnabled,
    count:
      args.imageLibraryReferenceCount ??
      args.flowArgs?.imageLibraryReferenceCount,
    referenceLibraryItems:
      args.referenceLibraryItems ?? args.flowArgs?.referenceLibraryItems ?? [],
    requiredImageIds: collectFrameSpecPreferredImageIds(args.frameSpec),
  });
  const hydrated = await Promise.all(
    candidates.map(async (candidate) => {
      const asset = await loadGeneratedImageAsset(candidate.imageId);
      if (!asset?.base64) return null;
      return {
        ...candidate,
        mimeType: candidate.mimeType || asset.mimeType || "image/png",
        base64: asset.base64,
        description: candidate.description || asset.description,
        prompt: candidate.prompt || asset.prompt,
        originalPrompt: candidate.originalPrompt || asset.originalPrompt,
        widthPx: candidate.widthPx ?? asset.widthPx,
        heightPx: candidate.heightPx ?? asset.heightPx,
        aspectRatio: candidate.aspectRatio ?? asset.aspectRatio,
        orientation: candidate.orientation || asset.orientation,
      };
    })
  );
  return hydrated.filter(Boolean) as PresentationRenderLibraryImageAsset[];
}

export function collectFrameSpecPreferredImageIds(
  frameSpec?: ReturnType<typeof buildFramePresentationSpecFromTaskPlan> | null
) {
  const imageIds = new Set<string>();
  for (const slide of frameSpec?.slideFrames || []) {
    for (const block of slide.blocks || []) {
      const imageId = block.visualRequest?.preferredImageId?.trim();
      if (imageId) imageIds.add(imageId);
    }
  }
  return imageIds;
}

function blockTextForDirectEdit(
  block: PresentationTaskSlideFrame["blocks"][number]
) {
  if (block.visualRequest) {
    return [
      block.visualRequest.brief,
      block.visualRequest.prompt,
      block.visualRequest.preferredImageId
        ? `Image ID: ${block.visualRequest.preferredImageId}`
        : "",
    ]
      .filter(Boolean)
      .join(" / ");
  }
  if (block.kind === "list") return (block.items || []).join("\n");
  return [block.heading, block.text, ...(block.items || [])]
    .filter(Boolean)
    .join("\n");
}

function buildPptDirectEditStructuredInput(args: {
  documentId: string;
  plan: PptDirectEditCandidate["plan"];
  instruction: string;
  imageLibraryContext: string;
}) {
  const slideFrames = (args.plan.slideFrames || []).map((slide) => ({
    slideNumber: slide.slideNumber,
    title: slide.title,
    layoutFrameId: slide.layoutFrameId,
    blocks: (slide.blocks || []).map((block, index) => ({
      blockNumber: index + 1,
      blockId: block.id,
      blockKind: block.kind,
      blockType: block.kind === "visual" || block.visualRequest ? "visual" : "text",
      heading: block.heading || "",
      text: block.text || "",
      items: block.items || [],
      currentText: blockTextForDirectEdit(block),
      visualRequest: block.visualRequest
        ? {
            type: block.visualRequest.type,
            brief: block.visualRequest.brief,
            prompt: block.visualRequest.prompt || "",
            preferredImageId: block.visualRequest.preferredImageId || "",
            labels: block.visualRequest.labels || [],
          }
        : null,
    })),
  }));

  return [
    `Document ID: ${args.documentId}`,
    `Title: ${args.plan.title}`,
    "",
    "User direct edit instruction:",
    args.instruction,
    "",
    "Current slide/block map:",
    JSON.stringify({ slideFrames }, null, 2),
    args.imageLibraryContext.trim()
      ? ["", "Image-library candidates:", args.imageLibraryContext.trim()].join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function resolveDirectEditBlock(args: {
  plan: PptDirectEditCandidate["plan"];
  edit: NonNullable<PresentationDirectEditInterpretation["edits"]>[number];
}) {
  const slideNumber = Number(args.edit.slideNumber) || 1;
  const slide =
    args.plan.slideFrames.find((item) => item.slideNumber === slideNumber) ||
    args.plan.slideFrames[0];
  const blockId = args.edit.blockId?.trim() || "";
  const blockIndex = slide
    ? blockId
      ? slide.blocks.findIndex((block) => block.id === blockId)
      : Number(args.edit.blockNumber || 1) - 1
    : -1;
  const safeBlockIndex =
    slide && blockIndex >= 0 && blockIndex < slide.blocks.length
      ? blockIndex
      : 0;
  const block = slide?.blocks[safeBlockIndex];
  return {
    slide,
    block,
    slideNumber: slide?.slideNumber || slideNumber,
    blockNumber: safeBlockIndex + 1,
  };
}

function buildPptDirectEditBlockEdits(args: {
  documentId: string;
  plan: PptDirectEditCandidate["plan"];
  instruction: string;
  interpretation?: PresentationDirectEditInterpretation | null;
}): PptDirectEditBlockEdit[] {
  const rawEdits = Array.isArray(args.interpretation?.edits)
    ? args.interpretation.edits
    : [];
  return rawEdits
    .map((rawEdit, index): PptDirectEditBlockEdit | null => {
      const resolved = resolveDirectEditBlock({
        plan: args.plan,
        edit: rawEdit,
      });
      if (!resolved.slide || !resolved.block) return null;
      const actualBlockType =
        resolved.block.kind === "visual" || resolved.block.visualRequest
          ? "visual"
          : "text";
      return {
        id: `edit-${index + 1}`,
        slideNumber: resolved.slideNumber,
        blockNumber: resolved.blockNumber,
        blockId: resolved.block.id || rawEdit.blockId || "",
        blockType: actualBlockType,
        blockKind: resolved.block.kind,
        instruction: rawEdit.instruction?.trim() || args.instruction,
        currentText:
          rawEdit.currentText?.trim() || blockTextForDirectEdit(resolved.block),
        proposedText: rawEdit.proposedText?.trim() || "",
        visualMode:
          actualBlockType === "visual"
            ? (rawEdit.visualMode as PptDirectEditBlockEdit["visualMode"]) ||
              "revise_prompt"
            : "none",
        imageId: rawEdit.imageId?.trim() || "",
        generationPrompt: rawEdit.generationPrompt?.trim() || "",
        visualBrief: rawEdit.visualBrief?.trim() || "",
        accepted: true,
      };
    })
    .filter(Boolean) as PptDirectEditBlockEdit[];
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

function createPresentationBlobUrl(args: {
  contentBase64?: string;
  mimeType?: string;
}) {
  if (!args.contentBase64 || typeof window === "undefined") return undefined;

  const binary = window.atob(args.contentBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return URL.createObjectURL(
    new Blob([bytes], {
      type:
        args.mimeType ||
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    })
  );
}

function appendPresentationAssistantMessage(args: {
  flowArgs: SendToGptFlowStepArgs;
  text: string;
}) {
  appendPresentationAssistantMessageToSetter({
    setGptMessages: args.flowArgs.setGptMessages,
    text: args.text,
  });
}

function appendPresentationAssistantMessageToSetter(args: {
  setGptMessages: SendToGptFlowStepArgs["setGptMessages"];
  text: string;
}) {
  args.setGptMessages((prev) => [
    ...prev,
    {
      id: generateId(),
      role: "gpt",
      text: args.text,
    },
  ]);
}

function buildPresentationPreviewMessage(args: {
  documentId: string;
  flowArgs: SendToGptFlowStepArgs;
}) {
  const foundPlan = findPresentationPlanByDocumentId({
    documentId: args.documentId,
    referenceLibraryItems: args.flowArgs.referenceLibraryItems,
  });
  if (foundPlan) {
    return [
      "Presentation design preview.",
      "",
      `Document ID: ${args.documentId}`,
      `Title: ${foundPlan.plan.title}`,
      `Slides: ${foundPlan.plan.slideFrames.length || foundPlan.plan.slides.length}`,
      "",
      formatPresentationTaskPlanText(foundPlan.plan),
    ].join("\n");
  }

  return `Presentation plan document not found: ${args.documentId}`;
}
