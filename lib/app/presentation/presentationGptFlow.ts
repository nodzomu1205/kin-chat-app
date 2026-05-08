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
import { resolvePresentationVisualSlots } from "@/lib/app/presentation/presentationVisualSelection";
import { requestPresentationVisualSlotNormalizationResult } from "@/lib/app/presentation/presentationVisualNormalization";
import {
  buildPresentationTaskPlanTextWithImagePreviews,
  collectSelectedVisualImageIds,
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

type PresentationRenderImageMode = "off" | "library" | "api" | "hybrid";

async function runRenderPresentationPptxFlow(args: {
  documentId?: string;
  flowArgs: SendToGptFlowStepArgs;
}) {
  if (!args.documentId) {
    throw new Error("Document ID is required for PPTX rendering.");
  }

  const foundPlan = findPresentationPlanByDocumentId({
    documentId: args.documentId,
    referenceLibraryItems: args.flowArgs.referenceLibraryItems,
  });
  const planSource =
    foundPlan ||
    saveRecentPresentationPlanByDocumentId({
      documentId: args.documentId,
      flowArgs: args.flowArgs,
    });
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

async function renderPresentationPptx(args: {
  documentId: string;
  spec?: unknown;
  frameSpec?: unknown;
  generateImages?: boolean;
  imageMode?: PresentationRenderImageMode;
  libraryImageAssets?: PresentationRenderLibraryImageAsset[];
}) {
  const requestBody = JSON.stringify(args);
  const res = await fetch("/api/presentation-render", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: requestBody,
  });
  const responseText = await res.text().catch(() => "");
  const data = safeParsePresentationRenderResponse(responseText) as {
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
        : buildPresentationRenderFailureDetail({
            status: res.status,
            statusText: res.statusText,
            responseText,
          })
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

function safeParsePresentationRenderResponse(value: string) {
  if (!value.trim()) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function buildPresentationRenderFailureDetail(args: {
  status: number;
  statusText: string;
  responseText: string;
}) {
  const preview = args.responseText.trim().slice(0, 260);
  return [
    `Presentation render failed. HTTP ${args.status}${
      args.statusText ? ` ${args.statusText}` : ""
    }.`,
    preview ? `Response preview: ${preview}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export type PresentationRenderLibraryImageAsset = {
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

const PPT_RENDER_IMAGE_MAX_BASE64_CHARS = 420_000;
const PPT_RENDER_IMAGE_MAX_EDGE_PX = 1280;

export async function hydratePresentationLibraryImageAssets(args: {
  flowArgs?: SendToGptFlowStepArgs;
  referenceLibraryItems?: SendToGptFlowStepArgs["referenceLibraryItems"];
  imageLibraryReferenceEnabled?: boolean;
  imageLibraryReferenceCount?: number;
  frameSpec?: ReturnType<typeof buildFramePresentationSpecFromTaskPlan>;
  onlyRequiredImageAssets?: boolean;
}): Promise<PresentationRenderLibraryImageAsset[]> {
  const requiredImageIds = collectFrameSpecPreferredImageIds(args.frameSpec);
  const candidates = getPresentationImageLibraryCandidates({
    enabled:
      args.imageLibraryReferenceEnabled ??
      args.flowArgs?.imageLibraryReferenceEnabled,
    count:
      args.onlyRequiredImageAssets
        ? 0
        : args.imageLibraryReferenceCount ??
          args.flowArgs?.imageLibraryReferenceCount,
    referenceLibraryItems:
      args.referenceLibraryItems ?? args.flowArgs?.referenceLibraryItems ?? [],
    requiredImageIds,
  });
  const hydrated = await Promise.all(
    candidates.map(async (candidate) => {
      const asset = await loadGeneratedImageAsset(candidate.imageId);
      if (!asset?.base64) return null;
      return optimizePresentationRenderImageAsset({
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
      });
    })
  );
  return hydrated.filter(Boolean) as PresentationRenderLibraryImageAsset[];
}

async function optimizePresentationRenderImageAsset(
  asset: PresentationRenderLibraryImageAsset
): Promise<PresentationRenderLibraryImageAsset> {
  if (
    typeof window === "undefined" ||
    typeof Image === "undefined" ||
    typeof document === "undefined" ||
    asset.base64.length <= PPT_RENDER_IMAGE_MAX_BASE64_CHARS
  ) {
    return asset;
  }

  const image = await loadPresentationRenderImage(asset).catch(() => null);
  if (!image) return asset;
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) return asset;

  const attempts = [
    { maxEdge: PPT_RENDER_IMAGE_MAX_EDGE_PX, quality: 0.84 },
    { maxEdge: 1120, quality: 0.76 },
    { maxEdge: 960, quality: 0.68 },
    { maxEdge: 820, quality: 0.62 },
  ];
  let best: PresentationRenderLibraryImageAsset | null = null;

  for (const attempt of attempts) {
    const scale = Math.min(1, attempt.maxEdge / Math.max(sourceWidth, sourceHeight));
    const widthPx = Math.max(1, Math.round(sourceWidth * scale));
    const heightPx = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = widthPx;
    canvas.height = heightPx;
    const context = canvas.getContext("2d");
    if (!context) continue;
    context.drawImage(image, 0, 0, widthPx, heightPx);
    const dataUrl = canvas.toDataURL("image/jpeg", attempt.quality);
    const base64 = dataUrl.split(",")[1] || "";
    if (!base64) continue;
    const optimized: PresentationRenderLibraryImageAsset = {
      ...asset,
      mimeType: "image/jpeg",
      base64,
      widthPx,
      heightPx,
      aspectRatio: widthPx / heightPx,
      orientation: resolvePresentationRenderImageOrientation(widthPx, heightPx),
    };
    best = !best || optimized.base64.length < best.base64.length ? optimized : best;
    if (base64.length <= PPT_RENDER_IMAGE_MAX_BASE64_CHARS) return optimized;
  }

  return best && best.base64.length < asset.base64.length ? best : asset;
}

function loadPresentationRenderImage(asset: PresentationRenderLibraryImageAsset) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load presentation render image."));
    image.src = `data:${asset.mimeType || "image/png"};base64,${asset.base64}`;
  });
}

function resolvePresentationRenderImageOrientation(
  widthPx: number,
  heightPx: number
): PresentationRenderLibraryImageAsset["orientation"] {
  const aspectRatio = widthPx / heightPx;
  if (Math.abs(aspectRatio - 1) < 0.08) return "square";
  return aspectRatio > 1 ? "landscape" : "portrait";
}

export function collectFrameSpecPreferredImageIds(
  frameSpec?: ReturnType<typeof buildFramePresentationSpecFromTaskPlan> | null
) {
  const imageIds = new Set<string>();
  collectVisualRequestImageIds(frameSpec?.deckFrame?.openingSlide?.visualRequest, imageIds);
  collectVisualRequestImageIds(frameSpec?.deckFrame?.closingSlide?.visualRequest, imageIds);
  for (const slide of frameSpec?.slideFrames || []) {
    for (const block of slide.blocks || []) {
      collectVisualRequestImageIds(block.visualRequest, imageIds);
    }
  }
  return imageIds;
}

function collectVisualRequestImageIds(
  visual: PresentationTaskSlideFrame["blocks"][number]["visualRequest"] | undefined,
  imageIds: Set<string>
) {
  const imageId = visual?.preferredImageId?.trim();
  if (imageId) imageIds.add(imageId);
  for (const candidateImageId of visual?.candidateImageIds || []) {
    if (candidateImageId.trim()) imageIds.add(candidateImageId.trim());
  }
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

type PresentationVisualSelectionCommand = {
  target: "opening" | "block";
  slideNumber: number;
  blockNumber: number;
  slotNumber?: number;
  off: boolean;
  imageIds: string[];
};

function parsePresentationVisualSelectionCommand(
  body: string
): PresentationVisualSelectionCommand[] {
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .flatMap((line): PresentationVisualSelectionCommand[] => {
      const openingMatch = line.match(/^Opening\s+slide\s*\/\s*visual(?:\s*\/\s*slot\s+(\d+))?\s*:\s*(.*)$/i);
      if (openingMatch) {
        const rawValue = openingMatch[2]?.trim() || "";
        return [
          {
            target: "opening" as const,
            slideNumber: 0,
            blockNumber: 0,
            slotNumber: openingMatch[1] ? Number(openingMatch[1]) : undefined,
            off: /^off$/i.test(rawValue),
            imageIds: /^off$/i.test(rawValue)
              ? []
              : rawValue
                  .split(/[,\s]+/)
                  .map((item) => item.trim())
                  .filter(Boolean),
          },
        ];
      }
      const match = line.match(/^Slide\s+(\d+)\s*\/\s*block\s+(\d+)(?:\s*\/\s*slot\s+(\d+))?\s*:\s*(.*)$/i);
      if (!match) return [];
      const rawValue = match[4]?.trim() || "";
      return [
        {
          target: "block" as const,
          slideNumber: Number(match[1]),
          blockNumber: Number(match[2]),
          slotNumber: match[3] ? Number(match[3]) : undefined,
          off: /^off$/i.test(rawValue),
          imageIds: /^off$/i.test(rawValue)
            ? []
            : rawValue
                .split(/[,\s]+/)
                .map((item) => item.trim())
                .filter(Boolean),
        },
      ];
    });
}

function applyPresentationVisualSelections(
  plan: PresentationTaskPlan,
  selections: ReturnType<typeof parsePresentationVisualSelectionCommand>
): PresentationTaskPlan {
  const openingSelections = selections.filter((item) => item.target === "opening");
  const openingBlockSelection = openingSelections.find((item) => !item.slotNumber);
  const updatedPlan: PresentationTaskPlan = {
    ...plan,
    updatedAt: new Date().toISOString(),
    deckFrame:
      openingSelections.length > 0 && plan.deckFrame?.openingSlide?.visualRequest
        ? {
            ...plan.deckFrame,
            openingSlide: {
              ...plan.deckFrame.openingSlide,
              visualRequest: openingBlockSelection
                ? applyVisualImageSelection(
                    plan.deckFrame.openingSlide.visualRequest,
                    openingBlockSelection
                  )
                : applyVisualSlotSelections(
                    plan.deckFrame.openingSlide.visualRequest,
                    openingSelections
                  ),
            },
          }
        : plan.deckFrame,
    slideFrames: plan.slideFrames.map((frame) => {
      const blocks = frame.blocks.map((block, index) => {
        const blockSelections = selections.filter(
          (item) =>
            item.target === "block" &&
            item.slideNumber === frame.slideNumber && item.blockNumber === index + 1
        );
        if (blockSelections.length === 0 || !block.visualRequest) return block;
        const blockSelection = blockSelections.find((item) => !item.slotNumber);
        return {
          ...block,
          visualRequest: blockSelection
            ? applyVisualImageSelection(block.visualRequest, blockSelection)
            : applyVisualSlotSelections(block.visualRequest, blockSelections),
        };
      });
      const primaryImageId =
        blocks.find((block) => block.visualRequest?.preferredImageId)?.visualRequest
          ?.preferredImageId || undefined;
      return {
        ...frame,
        blocks,
        layoutIntent: {
          ...frame.layoutIntent,
          primaryImageId,
        },
      };
    }),
  };
  return updatedPlan;
}

function mergeVisualSelectionProposal<
  T extends NonNullable<
    PresentationTaskSlideFrame["blocks"][number]["visualRequest"]
  >
>(originalVisual: T | undefined, proposedVisual: T): T {
  if (!originalVisual) return proposedVisual;
  const originalSelectedImageIds = collectSelectedVisualImageIds(originalVisual);
  if (originalSelectedImageIds.length > 0) {
    return {
      ...originalVisual,
      visualSlots: originalVisual.visualSlots || proposedVisual.visualSlots,
    };
  }
  return {
    ...originalVisual,
    preferredImageId: proposedVisual.preferredImageId,
    candidateImageIds: proposedVisual.candidateImageIds,
    selectionMatches: proposedVisual.selectionMatches,
    usagePolicy: proposedVisual.usagePolicy,
    maxVisualItems: proposedVisual.maxVisualItems,
    asset: proposedVisual.asset,
  };
}

function applyVisualImageSelection(
  visual: NonNullable<PresentationTaskSlideFrame["blocks"][number]["visualRequest"]>,
  selection: ReturnType<typeof parsePresentationVisualSelectionCommand>[number]
) {
  if (selection.off) {
    return {
      ...visual,
      preferredImageId: undefined,
      candidateImageIds: undefined,
      selectionMatches: undefined,
      asset: undefined,
    };
  }
  if (selection.imageIds.length === 0) return visual;
  const firstSlot = (visual.visualSlots || [])
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))[0];
  const label = firstSlot?.label || visual.labels?.[0] || visual.brief || "visual";
  const slotId = firstSlot?.slotId || label;
  const need = firstSlot?.need || visual.prompt || visual.brief || label;
  const usagePolicy =
    selection.imageIds.length > 1
      ? ("useOneOrMore" as const)
      : ("useOneBest" as const);
  return {
    ...visual,
    preferredImageId: selection.imageIds[0],
    candidateImageIds: selection.imageIds,
    usagePolicy,
    maxVisualItems: selection.imageIds.length,
    selectionMatches: selection.imageIds.map((imageId) => ({
      slotId,
      label,
      need,
      status: "selected" as const,
      imageId,
      score: 1,
      threshold: 1,
    })),
  };
}

function applyVisualSlotSelections(
  visual: NonNullable<PresentationTaskSlideFrame["blocks"][number]["visualRequest"]>,
  selections: ReturnType<typeof parsePresentationVisualSelectionCommand>
) {
  const slots = visualResolutionSlots(visual);
  if (slots.length === 0) return visual;
  const selectedSlotNumbers = new Set(
    selections
      .map((selection) => selection.slotNumber)
      .filter((slotNumber): slotNumber is number => typeof slotNumber === "number")
  );
  const preservedMatches = (visual.selectionMatches || []).filter((match) => {
    const slotIndex = slots.findIndex((slot) => slot.slotId === match.slotId);
    return slotIndex < 0 || !selectedSlotNumbers.has(slotIndex + 1);
  });
  const nextMatches = [...preservedMatches];
  for (const selection of selections) {
    if (!selection.slotNumber) continue;
    const slot = slots[selection.slotNumber - 1];
    if (!slot || selection.off) continue;
    const imageId = selection.imageIds[0]?.trim();
    if (!imageId) continue;
    nextMatches.push({
      slotId: slot.slotId,
      label: slot.label,
      need: slot.need,
      status: "selected" as const,
      imageId,
      score: 1,
      threshold: 1,
    });
  }
  const selectedMatches = slots.flatMap((slot) => {
    const match = nextMatches.find(
      (item) => item.slotId === slot.slotId && item.status === "selected" && item.imageId
    );
    return match ? [match] : [];
  });
  const imageIds = selectedMatches.map((match) => match.imageId as string);
  return {
    ...visual,
    preferredImageId: imageIds[0],
    candidateImageIds: imageIds.length > 0 ? imageIds : undefined,
    usagePolicy:
      imageIds.length > 1
        ? ("useOneOrMore" as const)
        : imageIds.length === 1
          ? ("useOneBest" as const)
          : undefined,
    maxVisualItems: imageIds.length > 0 ? imageIds.length : undefined,
    labels:
      selectedMatches.length > 0
        ? selectedMatches.map((match) => match.label).filter(Boolean)
        : visual.labels,
    selectionMatches: nextMatches.length > 0 ? nextMatches : undefined,
    asset: undefined,
  };
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

function mergePresentationPlanVisualSelections(args: {
  incomingPlan: PresentationTaskPlan;
  existingPlan: PresentationTaskPlan;
}): PresentationTaskPlan {
  return {
    ...args.incomingPlan,
    deckFrame: mergeDeckFrameVisualSelections({
      incomingDeckFrame: args.incomingPlan.deckFrame,
      existingDeckFrame: args.existingPlan.deckFrame,
    }),
    slideFrames: args.incomingPlan.slideFrames.map((incomingFrame) => {
      const existingFrame =
        args.existingPlan.slideFrames.find(
          (frame) => frame.slideNumber === incomingFrame.slideNumber
        ) || null;
      if (!existingFrame) return incomingFrame;
      return {
        ...incomingFrame,
        blocks: incomingFrame.blocks.map((incomingBlock, index) => {
          const existingBlock =
            existingFrame.blocks.find(
              (block) => block.id && block.id === incomingBlock.id
            ) || existingFrame.blocks[index];
          if (!incomingBlock.visualRequest || !existingBlock?.visualRequest) {
            return incomingBlock;
          }
          return {
            ...incomingBlock,
            visualRequest: preserveExistingVisualSelectionIfMissing({
              incomingVisual: incomingBlock.visualRequest,
              existingVisual: existingBlock.visualRequest,
            }),
          };
        }),
      };
    }),
  };
}

function mergeDeckFrameVisualSelections(args: {
  incomingDeckFrame: PresentationTaskPlan["deckFrame"];
  existingDeckFrame: PresentationTaskPlan["deckFrame"];
}) {
  if (
    !args.incomingDeckFrame?.openingSlide?.visualRequest ||
    !args.existingDeckFrame?.openingSlide?.visualRequest
  ) {
    return args.incomingDeckFrame;
  }
  return {
    ...args.incomingDeckFrame,
    openingSlide: {
      ...args.incomingDeckFrame.openingSlide,
      visualRequest: preserveExistingVisualSelectionIfMissing({
        incomingVisual: args.incomingDeckFrame.openingSlide.visualRequest,
        existingVisual: args.existingDeckFrame.openingSlide.visualRequest,
      }),
    },
  };
}

function preserveExistingVisualSelectionIfMissing(args: {
  incomingVisual: NonNullable<PresentationTaskSlideFrame["blocks"][number]["visualRequest"]>;
  existingVisual: NonNullable<PresentationTaskSlideFrame["blocks"][number]["visualRequest"]>;
}) {
  if (collectSelectedVisualImageIds(args.incomingVisual).length > 0) {
    return args.incomingVisual;
  }
  if (collectSelectedVisualImageIds(args.existingVisual).length === 0) {
    return args.incomingVisual;
  }
  const rebasedMatches = rebaseExistingSelectionMatches({
    incomingVisual: args.incomingVisual,
    existingVisual: args.existingVisual,
  });
  return {
    ...args.incomingVisual,
    preferredImageId: args.existingVisual.preferredImageId,
    candidateImageIds: args.existingVisual.candidateImageIds,
    selectionMatches: rebasedMatches || args.existingVisual.selectionMatches,
    usagePolicy: args.existingVisual.usagePolicy,
    maxVisualItems: args.existingVisual.maxVisualItems,
  };
}

function rebaseExistingSelectionMatches(args: {
  incomingVisual: NonNullable<PresentationTaskSlideFrame["blocks"][number]["visualRequest"]>;
  existingVisual: NonNullable<PresentationTaskSlideFrame["blocks"][number]["visualRequest"]>;
}) {
  const incomingSlots = visualResolutionSlots(args.incomingVisual);
  const existingSlots = visualResolutionSlots(args.existingVisual);
  const existingMatches = (args.existingVisual.selectionMatches || []).filter(
    (match) => match.status === "selected" && match.imageId
  );
  const selectedImageIds = collectSelectedVisualImageIds(args.existingVisual);
  const baseMatches =
    existingMatches.length > 0
      ? existingMatches
      : selectedImageIds.map((imageId, index) => ({
          slotId: incomingSlots[index]?.slotId || existingSlots[index]?.slotId || `slot${index + 1}`,
          label:
            incomingSlots[index]?.label ||
            args.incomingVisual.labels?.[index] ||
            existingSlots[index]?.label ||
            args.existingVisual.labels?.[index] ||
            args.existingVisual.brief ||
            "visual",
          need:
            incomingSlots[index]?.need ||
            existingSlots[index]?.need ||
            args.incomingVisual.prompt ||
            args.incomingVisual.brief ||
            args.existingVisual.prompt ||
            args.existingVisual.brief ||
            "visual",
          status: "selected" as const,
          imageId,
          score: 1,
          threshold: 1,
        }));
  if (baseMatches.length === 0) return undefined;
  return baseMatches.map((match, index) => {
    const incomingSlot =
      incomingSlots.find((slot) => slot.slotId === match.slotId) ||
      incomingSlots[index];
    const existingSlot =
      existingSlots.find((slot) => slot.slotId === match.slotId) ||
      existingSlots[index];
    return {
      ...match,
      slotId: incomingSlot?.slotId || match.slotId,
      label:
        incomingSlot?.label ||
        args.incomingVisual.labels?.[index] ||
        match.label,
      need:
        incomingSlot?.need ||
        existingSlot?.need ||
        args.incomingVisual.prompt ||
        args.incomingVisual.brief ||
        match.need,
    };
  });
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

function visualResolutionSlots(
  visual: NonNullable<PresentationTaskSlideFrame["blocks"][number]["visualRequest"]>
) {
  const slots = (visual.visualSlots || [])
    .filter((slot) => slot.need.trim() || slot.label.trim())
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  if (slots.length > 0) return slots;
  return [
    {
      slotId: "slot1",
      label: visual.labels?.[0] || visual.brief || "Visual",
      need: visual.prompt || visual.brief || "Visual",
      order: 1,
    },
  ];
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
