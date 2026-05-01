import type { ReferenceLibraryItem, StoredDocument } from "@/types/chat";
import type { ImageGenerationOptions } from "@/lib/server/presentation/imageGeneration";
import type { ImageGenerationUsage } from "@/lib/server/presentation/imageGeneration";
import { buildGeneratedImageDisplayText } from "@/lib/app/image/imageDisplayText";

export type GeneratedImageLibraryPayload = {
  version: "0.1-generated-image";
  imageId: string;
  mimeType: string;
  base64?: string;
  prompt: string;
  originalPrompt?: string;
  revisionInstruction?: string;
  description?: string;
  source?: "generated" | "imported";
  fileName?: string;
  fileSize?: number;
  originalMimeType?: string;
  widthPx?: number;
  heightPx?: number;
  aspectRatio?: number;
  orientation?: "landscape" | "portrait" | "square" | "unknown";
  alt?: string;
  sourcePromptHash?: string;
  options?: ImageGenerationOptions;
  usage?: ImageGenerationUsage;
  createdAt: string;
};

export function isGeneratedImageLibraryPayload(
  value: unknown
): value is GeneratedImageLibraryPayload {
  return (
    !!value &&
    typeof value === "object" &&
    (value as { version?: unknown }).version === "0.1-generated-image" &&
    typeof (value as { imageId?: unknown }).imageId === "string"
  );
}

export function findGeneratedImageByImageId(args: {
  imageId: string;
  referenceLibraryItems: ReferenceLibraryItem[];
}) {
  for (const item of args.referenceLibraryItems) {
    if (item.artifactType !== "generated_image") continue;
    const payload = item.structuredPayload;
    if (!isGeneratedImageLibraryPayload(payload)) continue;
    if (payload.imageId === args.imageId) {
      return { item, payload };
    }
  }
  return null;
}

export function buildGeneratedImageStoredDocument(args: {
  payload: GeneratedImageLibraryPayload;
  title?: string;
}): Omit<StoredDocument, "id" | "sourceType"> {
  const title = args.title?.trim() || `Image ${args.payload.imageId}`;
  const { base64: _base64, ...metadataPayload } = args.payload;
  const text = buildGeneratedImageDisplayText({ payload: args.payload });
  return {
    artifactType: "generated_image",
    title,
    filename: `${args.payload.imageId}.txt`,
    text,
    summary: args.payload.alt || title,
    charCount: text.length,
    structuredPayload: metadataPayload,
    createdAt: args.payload.createdAt,
    updatedAt: args.payload.createdAt,
  };
}
