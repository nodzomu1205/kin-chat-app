import type { PresentationTaskSlideFrame } from "@/types/task";
import {
  buildAdaptiveVisualMainAnnotation,
  isAdaptiveVisualMainBodyBlock,
  isMultiVisualMainRequest,
  normalizeAdaptiveVisualMainAnnotation,
} from "@/lib/app/presentation/presentationAdaptiveVisualMainAnnotation";
import {
  isDenseTextBlock,
} from "@/lib/app/presentation/presentationDenseFrameNormalization";
import { inferAdaptiveSlideRole } from "@/lib/app/presentation/presentationAdaptiveSlideRole";
import { resolveVisualImageId } from "@/lib/app/presentation/presentationFrameTitleNormalization";

export function applyAdaptiveLayoutPolicy(
  frames: PresentationTaskSlideFrame[]
): PresentationTaskSlideFrame[] {
  return frames.map((frame) => {
    const visualBlocks = frame.blocks.filter((block) => !!block.visualRequest);
    const textBlocks = frame.blocks.filter((block) => !block.visualRequest);
    const primaryVisual = visualBlocks[0];
    const primaryText = textBlocks[0];
    const inferredRole = inferAdaptiveSlideRole(frame);
    const role = frame.slideRole || inferredRole;

    if (role === "visualMain" && primaryVisual) {
      if (
        primaryVisual.visualRequest?.type === "photo" &&
        primaryText &&
        isDenseTextBlock(primaryText) &&
        !isAdaptiveVisualMainBodyBlock(primaryText) &&
        !isMultiVisualMainRequest(primaryVisual)
      ) {
        return {
          ...frame,
          slideRole: "textMain",
          layoutFrameId: "adaptiveTextMain",
          layoutIntent: {
            ...frame.layoutIntent,
            primaryImageId:
              frame.layoutIntent?.primaryImageId || resolveVisualImageId(primaryVisual),
            visualPlacement:
              frame.layoutIntent?.visualPlacement ||
              (visualBlocks.length > 1 ? "rightGrid" : "right"),
          },
          blocks: [primaryText, ...visualBlocks].slice(0, 7),
        };
      }
      const annotationBlock =
        normalizeAdaptiveVisualMainAnnotation(textBlocks[0], frame) ||
        buildAdaptiveVisualMainAnnotation(frame);
      const blocks =
        visualBlocks.length >= 6
          ? [...visualBlocks.slice(0, 6), annotationBlock]
          : [...visualBlocks, annotationBlock];
      return {
        ...frame,
        slideRole: "visualMain",
        layoutFrameId: "adaptiveVisualMain",
        layoutIntent: {
          ...frame.layoutIntent,
          primaryImageId:
            frame.layoutIntent?.primaryImageId || resolveVisualImageId(primaryVisual),
          textPlacement: frame.layoutIntent?.textPlacement || "right",
          notePolicy:
            frame.layoutIntent?.notePolicy ||
            (blocks.length > 1 ? "shortAnnotation" : "none"),
        },
        blocks,
      };
    }

    if (role === "textMain" && primaryText) {
      return {
        ...frame,
        slideRole: "textMain",
        layoutFrameId: "adaptiveTextMain",
        layoutIntent: {
          ...frame.layoutIntent,
          primaryImageId:
            frame.layoutIntent?.primaryImageId || resolveVisualImageId(primaryVisual),
          visualPlacement:
            frame.layoutIntent?.visualPlacement ||
            (visualBlocks.length > 1 ? "rightGrid" : "right"),
        },
        blocks: [primaryText, ...visualBlocks].slice(0, 7),
      };
    }

    return frame;
  });
}
