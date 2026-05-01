import {
  isGeneratedImageLibraryPayload,
  type GeneratedImageLibraryPayload,
} from "@/lib/app/image/imageLibrary";
import type { ReferenceLibraryItem } from "@/types/chat";

export type PresentationImageLibraryCandidate = {
  imageId: string;
  title: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  description?: string;
  prompt?: string;
  originalPrompt?: string;
  widthPx?: number;
  heightPx?: number;
  aspectRatio?: number;
  orientation?: GeneratedImageLibraryPayload["orientation"];
};

export function getPresentationImageLibraryCandidates(args: {
  enabled?: boolean;
  referenceLibraryItems: ReferenceLibraryItem[];
  count?: number;
}): PresentationImageLibraryCandidate[] {
  if (!args.enabled || (args.count ?? 0) <= 0) return [];
  return args.referenceLibraryItems
    .filter((item) => item.artifactType === "generated_image")
    .flatMap((item) => {
      const payload = item.structuredPayload;
      if (!isGeneratedImageLibraryPayload(payload)) return [];
      return [
        {
          imageId: payload.imageId,
          title: item.title,
          fileName: payload.fileName,
          mimeType: payload.mimeType || payload.originalMimeType,
          fileSize: payload.fileSize,
          description: payload.description || payload.alt || item.summary,
          prompt: payload.prompt,
          originalPrompt: payload.originalPrompt,
          widthPx: payload.widthPx,
          heightPx: payload.heightPx,
          aspectRatio: payload.aspectRatio,
          orientation: payload.orientation,
        },
      ];
    })
    .slice(0, Math.max(0, args.count ?? 0));
}

export function buildPresentationImageLibraryContext(
  candidates: PresentationImageLibraryCandidate[]
) {
  if (candidates.length === 0) return "";
  const lines = [
    "<<IMAGE_LIBRARY_CANDIDATES>>",
    "Use these existing image-library assets when they semantically fit a slide visual request. Prefer the Image ID in visual planning instead of inventing a new visual.",
    "First decide whether to use an image by semantic fit. After an image has been selected, use Orientation, Size, and Aspect ratio only to choose the slide/frame layout and visual block placement. Do not reject a semantically fitting image just because its aspect ratio differs from the default frame.",
    "For layout after selection: landscape assets fit wide/hero visual areas, portrait assets fit vertical/narrow visual areas, and square assets fit balanced/callout visual areas. Do not assume every selected image belongs in a 50/50 two-column block.",
  ];
  candidates.forEach((image, index) => {
    lines.push(`[IMAGE ${index + 1}]`);
    lines.push(`Image ID: ${image.imageId}`);
    lines.push(`Title: ${image.title}`);
    if (image.fileName) lines.push(`File: ${image.fileName}`);
    if (image.mimeType) lines.push(`MIME: ${image.mimeType}`);
    if (typeof image.fileSize === "number") lines.push(`File size: ${image.fileSize}`);
    if (image.orientation) lines.push(`Orientation: ${image.orientation}`);
    if (image.widthPx && image.heightPx) {
      lines.push(`Size: ${image.widthPx}x${image.heightPx}`);
    }
    if (typeof image.aspectRatio === "number") {
      lines.push(`Aspect ratio: ${image.aspectRatio.toFixed(3)}`);
    }
    if (image.description) lines.push(`Description: ${image.description}`);
    if (image.prompt) lines.push(`Prompt: ${image.prompt}`);
    if (image.originalPrompt) lines.push(`Original prompt: ${image.originalPrompt}`);
    lines.push("");
  });
  lines.push("<<END_IMAGE_LIBRARY_CANDIDATES>>");
  return lines.join("\n").trim();
}
