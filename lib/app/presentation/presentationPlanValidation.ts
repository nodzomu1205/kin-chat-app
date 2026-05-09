import type {
  PresentationTaskSlideFrame,
} from "@/types/task";
import {
  mergeConsecutiveDuplicateVisualOnlyFrames,
  resolveVisualImageId,
} from "@/lib/app/presentation/presentationFrameTitleNormalization";
import { applyAdaptiveLayoutPolicy } from "@/lib/app/presentation/presentationAdaptiveLayoutPolicy";
import { hasLargeNeighboringText } from "@/lib/app/presentation/presentationDenseFrameNormalization";
import { finalizeFrameNormalization } from "@/lib/app/presentation/presentationFrameFinalization";

export { syncDeckFrameSlideCount } from "@/lib/app/presentation/presentationDeckFrameValidation";

export function normalizePresentationVisualMainPolicy(
  frames: PresentationTaskSlideFrame[]
): PresentationTaskSlideFrame[] {
  const dedupedFrames = mergeConsecutiveDuplicateVisualOnlyFrames(frames);
  const primaryVisualIds = new Set(
    dedupedFrames.flatMap((frame) => {
      if (frame.layoutFrameId !== "singleCenter" || frame.blocks.length !== 1) {
        return [];
      }
      const imageId = resolveVisualImageId(frame.blocks[0]);
      return imageId ? [imageId] : [];
    })
  );

  const visualNormalized: PresentationTaskSlideFrame[] =
    primaryVisualIds.size === 0
      ? dedupedFrames
      : dedupedFrames.map((frame) => {
          const repeatedMainVisual = frame.blocks.find((block) => {
            const imageId = resolveVisualImageId(block);
            return imageId ? primaryVisualIds.has(imageId) : false;
          });
          if (!repeatedMainVisual) return frame;
          if (frame.layoutFrameId === "singleCenter" && frame.blocks.length === 1) {
            return frame;
          }
          if (!hasLargeNeighboringText(frame.blocks, repeatedMainVisual)) return frame;

          return {
            ...frame,
            layoutFrameId: "singleCenter",
            blocks: [repeatedMainVisual],
          };
        });

  return finalizeFrameNormalization(applyAdaptiveLayoutPolicy(visualNormalized));
}

