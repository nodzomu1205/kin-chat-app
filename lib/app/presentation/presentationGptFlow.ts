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
  buildPresentationRenderedMessage,
} from "@/lib/app/presentation/presentationGptPrompts";
import {
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
        action: "renderPptx",
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
    applyGeneratedImageUsage({
      generatedImages: output.generatedImages,
      flowArgs: args.flowArgs,
    });
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
  flowArgs: SendToGptFlowStepArgs;
  frameSpec?: ReturnType<typeof buildFramePresentationSpecFromTaskPlan>;
}): Promise<PresentationRenderLibraryImageAsset[]> {
  const candidates = getPresentationImageLibraryCandidates({
    enabled: args.flowArgs.imageLibraryReferenceEnabled,
    count: args.flowArgs.imageLibraryReferenceCount,
    referenceLibraryItems: args.flowArgs.referenceLibraryItems,
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

function applyGeneratedImageUsage(args: {
  generatedImages?: Array<{
    usage?: import("@/lib/server/presentation/imageGeneration").ImageGenerationUsage;
  }>;
  flowArgs: SendToGptFlowStepArgs;
}) {
  for (const image of args.generatedImages || []) {
    const usage = normalizeImageGenerationUsage(image.usage);
    if (usage) args.flowArgs.applyImageUsage?.(usage);
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
  args.flowArgs.setGptMessages((prev) => [
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
