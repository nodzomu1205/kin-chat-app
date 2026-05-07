import {
  isGeneratedImageLibraryPayload,
  type GeneratedImageLibraryPayload,
  type GeneratedImagePresentationMeta,
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
  presentationMeta?: GeneratedImagePresentationMeta;
};

export function getPresentationImageLibraryCandidates(args: {
  enabled?: boolean;
  referenceLibraryItems: ReferenceLibraryItem[];
  count?: number;
  requiredImageIds?: Iterable<string>;
}): PresentationImageLibraryCandidate[] {
  if (!args.enabled) return [];
  const requiredImageIds = new Set(args.requiredImageIds || []);
  const candidates = args.referenceLibraryItems
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
          presentationMeta: payload.presentationMeta,
        },
      ];
    });
  const limited = candidates.slice(0, Math.max(0, args.count ?? 0));
  const included = new Set(limited.map((candidate) => candidate.imageId));
  const required = candidates.filter(
    (candidate) =>
      matchesRequiredImageId(candidate, requiredImageIds) &&
      !included.has(candidate.imageId)
  );
  return [...limited, ...required];
}

function matchesRequiredImageId(
  candidate: PresentationImageLibraryCandidate,
  requiredImageIds: Set<string>
) {
  if (requiredImageIds.has(candidate.imageId)) return true;
  if (candidate.title && requiredImageIds.has(candidate.title)) return true;
  if (candidate.fileName && requiredImageIds.has(candidate.fileName)) return true;
  return false;
}

function buildVisualRoleHint(image: PresentationImageLibraryCandidate) {
  const shape =
    image.orientation ||
    (typeof image.aspectRatio === "number"
      ? image.aspectRatio >= 1.25
        ? "landscape"
        : image.aspectRatio <= 0.8
          ? "portrait"
          : "square"
      : "unknown");
  const baseType = image.presentationMeta?.visualBaseType || "unknown";
  return `base=${baseType}; shape=${shape}; decide visualMain/textMain only by matching visible subjects, embedded text, and relationships to the slide key message`;
}

function buildCaptionSeed(image: PresentationImageLibraryCandidate) {
  const meta = image.presentationMeta;
  const embeddedText = meta?.embeddedTextItems
    .map((item) => item.text.trim())
    .filter(Boolean)
    .slice(0, 2);
  const subjects = meta?.visibleSubjects.map((item) => item.trim()).filter(Boolean).slice(0, 3);
  const tags = meta?.semanticTags.map((item) => item.trim()).filter(Boolean).slice(0, 3);
  const parts = [
    ...(embeddedText || []),
    ...(subjects || []),
    ...(tags || []),
    image.title?.trim(),
  ].filter(Boolean);
  return Array.from(new Set(parts)).slice(0, 5).join(" / ");
}

export function buildPresentationImageLibraryContext(
  candidates: PresentationImageLibraryCandidate[]
) {
  if (candidates.length === 0) return "";
  const lines = [
    "<<IMAGE_LIBRARY_CANDIDATES>>",
    "These existing image-library assets are planning material for the app-side visual slot matcher.",
    "Do not refer to a specific asset by identifier. Asset identifiers are intentionally hidden from this planning context.",
    "Use this metadata only to define visualRequest.visualSlots: slotId, label, need, optional keywords, and order.",
    "The app will deterministically match visualSlots to stored assets after your slideFrame JSON is parsed.",
    "presentationMeta is extracted planning material. Use visible subjects, embedded text items, relationships, and semantic tags to describe concrete visualSlots.",
    "For new slideFrames, prefer adaptiveVisualMain when an image should be the main carrier: place the selected image at the top-left, preserve aspect ratio, maximize it in the content area, and use only the remaining right or bottom-right space for a short annotation if needed.",
    "Prefer adaptiveTextMain when the message text is the main carrier: put the primary text at the top-left, choose a text shape that leaves the most useful remaining area, and place one or more related images in that remaining area.",
    "For textMain slides, create ordered visualSlots when multiple related images may support the message.",
    "Keep visualSlot order aligned to the corresponding text order. For example, upstream, midstream, downstream slots should follow that text sequence.",
    "Use the deck/user language for visualSlot.label. Keep visualSlot.need and keywords concrete and searchable, adding concise English nouns alongside deck-language wording when the deck language is not English.",
    "Do not make visualSlot.label narrower than the requested visual meaning or likely selected asset; if the slot covers agriculture plus primary processing, the label should reflect that broader range.",
    "Do not assert a specific country, location, company, person, or named system in visualSlot.label unless this image-library metadata explicitly supports that same entity; otherwise use a generic display label.",
    "For each slide, set slideRole to visualMain or textMain based on the slide key message.",
  ];
  candidates.forEach((image, index) => {
    lines.push(`[VISUAL ASSET ${index + 1}]`);
    lines.push(`Title: ${image.title}`);
    const captionSeed = buildCaptionSeed(image);
    if (captionSeed) lines.push(`Caption seed: ${captionSeed}`);
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
    if (image.presentationMeta) {
      lines.push(`Visual base type: ${image.presentationMeta.visualBaseType}`);
      if (image.presentationMeta.visibleSubjects.length) {
        lines.push(`Visible subjects: ${image.presentationMeta.visibleSubjects.join(", ")}`);
      }
      if (image.presentationMeta.embeddedTextItems.length) {
        lines.push(
          `Embedded text items: ${image.presentationMeta.embeddedTextItems
            .map((item) => `${item.text} (${item.role}, ${item.location || "unknown"})`)
            .join("; ")}`
        );
      }
      if (image.presentationMeta.relationships.length) {
        lines.push(
          `Relationships: ${image.presentationMeta.relationships
            .map((item) =>
              `${item.type}: ${item.items.join(", ")}${item.evidence ? ` - ${item.evidence}` : ""}`
            )
            .join("; ")}`
        );
      }
      if (image.presentationMeta.semanticTags.length) {
        lines.push(`Semantic tags: ${image.presentationMeta.semanticTags.join(", ")}`);
      }
      lines.push(`Composition: ${image.presentationMeta.composition}`);
    }
    lines.push(`Visual role hint: ${buildVisualRoleHint(image)}`);
    if (image.description) lines.push(`Description: ${image.description}`);
    if (image.prompt) lines.push(`Prompt: ${image.prompt}`);
    if (image.originalPrompt) lines.push(`Original prompt: ${image.originalPrompt}`);
    lines.push("");
  });
  lines.push("<<END_IMAGE_LIBRARY_CANDIDATES>>");
  return lines.join("\n").trim();
}
