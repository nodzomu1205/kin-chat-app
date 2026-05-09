import { loadGeneratedImageAsset } from "@/lib/app/image/imageAssetStorage";
import {
  getPresentationImageLibraryCandidates,
} from "@/lib/app/presentation/presentationImageLibrary";
import type { SendToGptFlowStepArgs } from "@/lib/app/send-to-gpt/sendToGptFlowStepBuilders";
import type { PresentationTaskSlideFrame } from "@/types/task";
import type {
  buildFramePresentationSpecFromTaskPlan,
} from "@/lib/app/presentation/presentationTaskPlanning";
import { optimizePresentationRenderImageAsset } from "@/lib/app/presentation/presentationRenderImageOptimization";

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

export async function hydratePresentationLibraryImageAssets(args: {
  flowArgs?: SendToGptFlowStepArgs;
  referenceLibraryItems?: SendToGptFlowStepArgs["referenceLibraryItems"];
  imageLibraryReferenceEnabled?: boolean;
  imageLibraryReferenceCount?: number;
  frameSpec?: ReturnType<typeof buildFramePresentationSpecFromTaskPlan>;
  onlyRequiredImageAssets?: boolean;
}): Promise<PresentationRenderLibraryImageAsset[]> {
  const requiredImageIds = collectFrameSpecPreferredImageIds(args.frameSpec);
  const hasRequiredImageIds = requiredImageIds.size > 0;
  const candidates = getPresentationImageLibraryCandidates({
    enabled:
      hasRequiredImageIds ||
      (args.imageLibraryReferenceEnabled ??
        args.flowArgs?.imageLibraryReferenceEnabled),
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
