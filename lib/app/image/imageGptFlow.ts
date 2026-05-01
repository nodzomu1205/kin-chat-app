import { generateId } from "@/lib/shared/uuid";
import { parseImageCommand } from "@/lib/app/image/imageCommandParser";
import {
  buildGeneratedImageStoredDocument,
  findGeneratedImageByImageId,
  type GeneratedImageLibraryPayload,
} from "@/lib/app/image/imageLibrary";
import {
  hydrateGeneratedImagePayload,
  loadGeneratedImagePayloadById,
  saveGeneratedImageAsset,
} from "@/lib/app/image/imageAssetStorage";
import {
  buildGeneratedImageDisplayText,
  normalizeImageGenerationUsage,
} from "@/lib/app/image/imageDisplayText";
import { buildDescriptionText } from "@/lib/app/image/imageImportFlow";
import { requestFileIngest } from "@/lib/app/ingest/ingestClient";
import { normalizeUsage } from "@/lib/shared/tokenStats";
import type { ImageGenerationOptions } from "@/lib/server/presentation/imageGeneration";
import { findPresentationPlanByDocumentId } from "@/lib/app/presentation/presentationPlanLibrary";
import { formatPresentationTaskPlanText } from "@/lib/app/presentation/presentationTaskPlanning";
import {
  applySendToGptRequestStart,
} from "@/lib/app/send-to-gpt/sendToGptFlowState";
import type { SendToGptFlowStepArgs } from "@/lib/app/send-to-gpt/sendToGptFlowStepBuilders";
import type { Message } from "@/types/chat";

export async function runImageGptCommandFlow(args: {
  rawText: string;
  flowArgs: SendToGptFlowStepArgs;
}): Promise<boolean> {
  const command = parseImageCommand(args.rawText);
  if (!command.isImageCommand) return false;

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
    if (command.intent === "createImage") {
      await createStandaloneImage({
        prompt: extractImageInstruction(command.body).prompt,
        options: extractImageInstruction(command.body).options,
        flowArgs: args.flowArgs,
      });
      return true;
    }

    const foundImage = findGeneratedImageByImageId({
      imageId: command.imageId,
      referenceLibraryItems: args.flowArgs.referenceLibraryItems,
    });
    const foundPayload = foundImage
      ? await hydrateGeneratedImagePayload(foundImage.payload)
      : await loadGeneratedImagePayloadById(command.imageId);
    if (!foundPayload) {
      throw new Error(`Image not found: ${command.imageId}`);
    }
    if (/^(save|保存|ライブラリ保存|保存して)$/iu.test(command.body.trim())) {
      const alreadySaved = !!foundImage;
      const payloadToSave =
        !alreadySaved &&
        args.flowArgs.imageLibraryImportMode === "image_with_description"
          ? await describeGeneratedImageForLibrary({
              payload: foundPayload,
              flowArgs: args.flowArgs,
            })
          : foundPayload;
      if (!alreadySaved) {
        await saveGeneratedImageAsset(payloadToSave);
        args.flowArgs.recordIngestedDocument(
          buildGeneratedImageStoredDocument({
            payload: payloadToSave,
            title: `Image ${payloadToSave.imageId}`,
          })
        );
      }
      appendImageAssistantMessage({
        flowArgs: args.flowArgs,
        text: [
          alreadySaved
            ? "Image is already saved in the image library."
            : "Image saved to the image library.",
          "",
          `Image ID: ${payloadToSave.imageId}`,
        ].join("\n"),
      });
      return true;
    }
    const instruction = extractImageInstruction(command.body);
    if (command.applyTo && !command.body) {
      applyImageToPresentationBlock({
        image: foundPayload,
        applyTo: command.applyTo,
        flowArgs: args.flowArgs,
      });
      return true;
    }
    const revisedImage = await createStandaloneImage({
      prompt: foundPayload.originalPrompt || foundPayload.prompt,
      instruction: instruction.prompt,
      options: {
        ...(foundPayload.options || {}),
        ...instruction.options,
      },
      imageIdSeed: command.imageId,
      previousImageId: command.imageId,
      flowArgs: args.flowArgs,
    });
    if (command.applyTo) {
      applyImageToPresentationBlock({
        image: revisedImage,
        applyTo: command.applyTo,
        flowArgs: args.flowArgs,
      });
    }
    return true;
  } catch (error) {
    appendImageAssistantMessage({
      flowArgs: args.flowArgs,
      text: [
        "Could not create the image.",
        "",
        error instanceof Error ? error.message : "Image generation failed.",
      ].join("\n"),
    });
    return true;
  } finally {
    args.flowArgs.setGptLoading(false);
  }
}

async function describeGeneratedImageForLibrary(args: {
  payload: GeneratedImageLibraryPayload;
  flowArgs: SendToGptFlowStepArgs;
}): Promise<GeneratedImageLibraryPayload> {
  if (!args.payload.base64 || !args.flowArgs.imageDescriptionIngestOptions) {
    return args.payload;
  }
  const { response, data } = await requestFileIngest({
    file: imagePayloadToFile(args.payload),
    options: {
      ...args.flowArgs.imageDescriptionIngestOptions,
      kind: "image",
    },
  });
  args.flowArgs.applyIngestUsage?.(normalizeUsage(data?.usage));
  if (!response.ok) return args.payload;
  const description = buildDescriptionText(data?.result || {});
  return description ? { ...args.payload, description } : args.payload;
}

function imagePayloadToFile(payload: GeneratedImageLibraryPayload) {
  const mimeType = payload.mimeType || "image/png";
  const binary = window.atob(payload.base64 || "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new File(
    [bytes],
    `${payload.imageId}.${mimeType.split("/").pop() || "png"}`,
    { type: mimeType }
  );
}

async function createStandaloneImage(args: {
  prompt: string;
  instruction?: string;
  imageIdSeed?: string;
  previousImageId?: string;
  options?: ImageGenerationOptions;
  flowArgs: SendToGptFlowStepArgs;
}): Promise<GeneratedImageLibraryPayload> {
  const output = await requestGeneratedImage({
    prompt: args.prompt,
    instruction: args.instruction,
    imageIdSeed: args.imageIdSeed,
    options: args.options,
  });
  const payload: GeneratedImageLibraryPayload = {
    version: "0.1-generated-image",
    imageId: output.imageId,
    mimeType: output.mimeType,
    base64: output.contentBase64,
    prompt: output.prompt,
    originalPrompt: args.prompt,
    revisionInstruction: args.instruction,
    source: "generated",
    alt: output.alt,
    sourcePromptHash: output.sourcePromptHash,
    options: output.options,
    usage: output.usage,
    createdAt: output.createdAt,
  };
  await saveGeneratedImageAsset(payload);
  const tokenUsage = normalizeImageGenerationUsage(output.usage);
  if (tokenUsage) {
    args.flowArgs.applyImageUsage?.(tokenUsage);
  }

  appendImageAssistantMessage({
    flowArgs: args.flowArgs,
    text: buildImageCreatedMessage({
      previousImageId: args.previousImageId,
      path: createImageBlobUrl({
        contentBase64: output.contentBase64,
        mimeType: output.mimeType,
      }),
      payload,
    }),
  });
  return payload;
}

function applyImageToPresentationBlock(args: {
  image: GeneratedImageLibraryPayload;
  applyTo: string;
  flowArgs: SendToGptFlowStepArgs;
}) {
  if (!args.image.base64) {
    throw new Error(`Image bytes are not available: ${args.image.imageId}`);
  }
  const imageBase64 = args.image.base64;
  const address = parsePresentationBlockAddress(args.applyTo);
  if (!address.documentId || !address.slideNumber || !address.blockId) {
    throw new Error(
      "Apply to needs a Document ID, slide number, and block ID, for example: Apply to: Document ID ppt_xxx / Slide 2 / block1"
    );
  }
  const foundPlan = findPresentationPlanByDocumentId({
    documentId: address.documentId,
    referenceLibraryItems: args.flowArgs.referenceLibraryItems,
  });
  if (!foundPlan) {
    throw new Error(`Presentation plan document not found: ${address.documentId}`);
  }

  let applied = false;
  const nextPlan = {
    ...foundPlan.plan,
    slideFrames: foundPlan.plan.slideFrames.map((slide) => {
      if (slide.slideNumber !== address.slideNumber) return slide;
      return {
        ...slide,
        blocks: slide.blocks.map((block) => {
          if (block.id !== address.blockId) return block;
          applied = true;
          return {
            ...block,
            kind: "visual" as const,
            styleId:
              block.styleId === "visualCover" ? block.styleId : ("visualContain" as const),
            heading: undefined,
            text: undefined,
            items: undefined,
            visualRequest: {
              ...(block.visualRequest || {
                type: "illustration" as const,
                brief: args.image.alt || args.image.imageId,
              }),
              prompt: args.image.prompt,
              asset: {
                imageId: args.image.imageId,
                mimeType: args.image.mimeType,
                base64: imageBase64,
                alt: args.image.alt,
                sourcePromptHash: args.image.sourcePromptHash,
              },
            },
          };
        }),
      };
    }),
    updatedAt: new Date().toISOString(),
  };
  if (!applied) {
    throw new Error(
      `Block not found: Slide ${address.slideNumber} / ${address.blockId}`
    );
  }
  args.flowArgs.updateStoredDocument(foundPlan.sourceId, {
    title: foundPlan.item.title,
    text: formatPresentationTaskPlanText(nextPlan),
    structuredPayload: nextPlan,
    summary: foundPlan.item.summary,
  });
  appendImageAssistantMessage({
    flowArgs: args.flowArgs,
    text: [
      "Image applied to presentation design.",
      "",
      `Image ID: ${args.image.imageId}`,
      `Document ID: ${address.documentId}`,
      `Address: Slide ${address.slideNumber} / ${address.blockId}`,
    ].join("\n"),
  });
}

function parsePresentationBlockAddress(value: string) {
  const documentId =
    value.match(/Document ID\s*:?\s*([A-Za-z0-9_-]+)/iu)?.[1] ||
    value.match(/\b(ppt_[A-Za-z0-9_-]+)/u)?.[1] ||
    "";
  const slideNumberText =
    value.match(/Slide\s*:?\s*(\d+)/iu)?.[1] ||
    value.match(/スライド\s*:?\s*(\d+)/u)?.[1] ||
    "";
  const blockId =
    value.match(/Block ID\s*:?\s*([A-Za-z0-9_-]+)/iu)?.[1] ||
    value.match(/\b(block\d+)\b/iu)?.[1] ||
    "";
  return {
    documentId,
    slideNumber: Number(slideNumberText) || 0,
    blockId,
  };
}

async function requestGeneratedImage(args: {
  prompt: string;
  instruction?: string;
  imageIdSeed?: string;
  options?: ImageGenerationOptions;
}) {
  const res = await fetch("/api/image-generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  const data = (await res.json().catch(() => ({}))) as {
    image?: {
    imageId?: string;
      mimeType?: string;
      contentBase64?: string;
      prompt?: string;
      alt?: string;
      sourcePromptHash?: string;
      options?: ImageGenerationOptions;
      usage?: import("@/lib/server/presentation/imageGeneration").ImageGenerationUsage;
      createdAt?: string;
    };
    error?: unknown;
  };
  if (!res.ok || !data.image?.contentBase64) {
    throw new Error(
      typeof data.error === "string" && data.error.trim()
        ? data.error.trim()
        : "Image generation failed."
    );
  }
  return {
    imageId: data.image.imageId || `img_${Date.now().toString(36)}`,
    mimeType: data.image.mimeType || "image/png",
    contentBase64: data.image.contentBase64,
    prompt: data.image.prompt || args.prompt,
    alt: data.image.alt || "",
    sourcePromptHash: data.image.sourcePromptHash || "",
    options: data.image.options,
    usage: data.image.usage,
    createdAt: data.image.createdAt || new Date().toISOString(),
  };
}

function buildImageCreatedMessage(args: {
  previousImageId?: string;
  path?: string;
  payload: GeneratedImageLibraryPayload;
}) {
  return buildGeneratedImageDisplayText({
    payload: args.payload,
    imagePath: args.path,
    originalImageId: args.previousImageId,
    heading: "Image created.",
  });
}

function extractImageInstruction(value: string): {
  prompt: string;
  options: ImageGenerationOptions;
} {
  const options: ImageGenerationOptions = {};
  const bodyLines: string[] = [];
  value.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    const optionMatch = line.match(/^(Model|Size|Quality|Format|Output Format|Background|Compression|Output Compression|Moderation|Style)\s*:\s*(.+)$/iu);
    if (optionMatch) {
      applyImageOption(options, optionMatch[1], optionMatch[2]);
      return;
    }
    bodyLines.push(rawLine);
  });
  const prompt = bodyLines.join("\n").trim();
  inferImageOptionsFromNaturalText(options, prompt);
  return { prompt, options };
}

function applyImageOption(options: ImageGenerationOptions, key: string, value: string) {
  const normalizedKey = key.toLowerCase();
  const normalizedValue = value.trim().toLowerCase();
  if (normalizedKey === "model") {
    if (
      normalizedValue === "gpt-image-1" ||
      normalizedValue === "gpt-image-1-mini" ||
      normalizedValue === "gpt-image-1.5" ||
      normalizedValue === "dall-e-3" ||
      normalizedValue === "dall-e-2"
    ) {
      options.model = normalizedValue;
    }
    return;
  }
  if (normalizedKey === "size") {
    options.size = normalizeImageSize(normalizedValue);
    return;
  }
  if (normalizedKey === "quality") {
    options.quality = normalizeImageQuality(normalizedValue);
    return;
  }
  if (normalizedKey === "format" || normalizedKey === "output format") {
    if (normalizedValue === "png" || normalizedValue === "jpeg" || normalizedValue === "webp") {
      options.outputFormat = normalizedValue;
    }
    return;
  }
  if (normalizedKey === "background") {
    if (
      normalizedValue === "auto" ||
      normalizedValue === "transparent" ||
      normalizedValue === "opaque"
    ) {
      options.background = normalizedValue;
    }
    return;
  }
  if (normalizedKey === "compression" || normalizedKey === "output compression") {
    const number = Number(normalizedValue);
    if (Number.isFinite(number)) {
      options.outputCompression = Math.max(0, Math.min(100, Math.round(number)));
    }
    return;
  }
  if (normalizedKey === "moderation") {
    if (normalizedValue === "auto" || normalizedValue === "low") {
      options.moderation = normalizedValue;
    }
    return;
  }
  if (normalizedKey === "style") {
    if (normalizedValue === "vivid" || normalizedValue === "natural") {
      options.style = normalizedValue;
    }
  }
}

function inferImageOptionsFromNaturalText(
  options: ImageGenerationOptions,
  text: string
) {
  if (!options.size) {
    if (/横長|ワイド|landscape|wide|16:9|横向き/iu.test(text)) {
      options.size = "1536x1024";
    } else if (/縦長|portrait|縦向き/iu.test(text)) {
      options.size = "1024x1536";
    } else if (/正方形|square/iu.test(text)) {
      options.size = "1024x1024";
    }
  }
  if (!options.quality) {
    if (/高品質|high quality|quality high|精細|高精細/iu.test(text)) {
      options.quality = "high";
    } else if (/低品質|軽量|low quality|quality low/iu.test(text)) {
      options.quality = "low";
    }
  }
  if (!options.background && /透明|transparent/iu.test(text)) {
    options.background = "transparent";
    options.outputFormat = options.outputFormat || "png";
  }
}

function normalizeImageSize(value: string): ImageGenerationOptions["size"] {
  if (/横長|ワイド|landscape|wide|16:9|1536x1024/.test(value)) return "1536x1024";
  if (/縦長|portrait|1024x1536/.test(value)) return "1024x1536";
  if (/正方形|square|1024x1024/.test(value)) return "1024x1024";
  if (/1792x1024/.test(value)) return "1792x1024";
  if (/1024x1792/.test(value)) return "1024x1792";
  if (/512x512/.test(value)) return "512x512";
  if (/256x256/.test(value)) return "256x256";
  if (/auto|自動/.test(value)) return "auto";
  return undefined;
}

function normalizeImageQuality(value: string): ImageGenerationOptions["quality"] {
  if (/high|高/.test(value)) return "high";
  if (/medium|中/.test(value)) return "medium";
  if (/low|低|軽量/.test(value)) return "low";
  if (/hd/.test(value)) return "hd";
  if (/standard|標準/.test(value)) return "standard";
  if (/auto|自動/.test(value)) return "auto";
  return undefined;
}

function createImageBlobUrl(args: { contentBase64?: string; mimeType?: string }) {
  if (!args.contentBase64 || typeof window === "undefined") return undefined;
  const binary = window.atob(args.contentBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return URL.createObjectURL(
    new Blob([bytes], {
      type: args.mimeType || "image/png",
    })
  );
}

function appendImageAssistantMessage(args: {
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
