import {
  isGeneratedImageLibraryPayload,
  type GeneratedImageLibraryPayload,
  type GeneratedImagePresentationMeta,
} from "@/lib/app/image/imageLibrary";
import type { ReferenceLibraryItem } from "@/types/chat";
export { buildPresentationImageLibraryContext } from "@/lib/app/presentation/presentationImageLibraryContext";

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
