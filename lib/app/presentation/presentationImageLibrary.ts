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
    "Use these existing image-library assets when they semantically fit a slide visual request.",
    "The Image IDs in this section are a closed allowlist for library-image planning. Use only these exact Image IDs in preferredImageId and candidateImageIds. Never invent, rename, abbreviate, or derive an Image ID from a filename.",
    "If no listed Image ID fits a needed visual, leave that visual unresolved and add a warning or missingInfo entry instead of making up an ID.",
    "First decide whether to use an image by semantic fit with the slide key message. After an image has been selected, use Orientation, Size, Aspect ratio, and presentationMeta as planning material.",
    "presentationMeta is extracted planning material, not a final visualMain/textMain judgment. Do not reclassify images from keyword hits in descriptions.",
    "Decide visualMain vs textMain by matching the slide key message against visible subjects, embedded text items, relationships, and semantic tags.",
    "For new slideFrames, prefer adaptiveVisualMain when an image should be the main carrier: place the selected image at the top-left, preserve aspect ratio, maximize it in the content area, and use only the remaining right or bottom-right space for a short annotation if needed.",
    "Prefer adaptiveTextMain when the message text is the main carrier: put the primary text at the top-left, choose a text shape that leaves the most useful remaining area, and place one or more related images in that remaining area.",
    "For textMain slides, list all semantically relevant image candidates in candidateImageIds in relevance order; the renderer decides how many can fit. Use usagePolicy useOneOrMore or useAsGrid instead of prematurely narrowing to one image.",
    "When you provide visualRequest.labels for candidateImageIds, labels must be one-to-one with the selected Image IDs in exactly the same order and exactly the same count.",
    "Each label must be derived from that exact candidate's Caption seed, Title, Visible subjects, or Embedded text items. Never assign a planned process step or generic slide concept to an image unless that specific image visibly contains it.",
    "If the deck is Japanese, translate labels into concise Japanese while preserving the candidate's actual visible meaning. If unsure, omit labels rather than guessing.",
    "For each slide that uses these candidates, set slideRole to visualMain or textMain and include layoutIntent.primaryImageId only when one image is central to the layout.",
  ];
  candidates.forEach((image, index) => {
    lines.push(`[IMAGE ${index + 1}]`);
    lines.push(`Image ID: ${image.imageId}`);
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
