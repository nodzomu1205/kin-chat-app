import { loadGeneratedImageAsset } from "@/lib/app/image/imageAssetStorage";
import {
  getPresentationImageLibraryCandidates,
} from "@/lib/app/presentation/presentationImageLibrary";
import type { SendToGptFlowStepArgs } from "@/lib/app/send-to-gpt/sendToGptFlowStepBuilders";
import type { PresentationTaskSlideFrame } from "@/types/task";
import type {
  buildFramePresentationSpecFromTaskPlan,
} from "@/lib/app/presentation/presentationTaskPlanning";

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
