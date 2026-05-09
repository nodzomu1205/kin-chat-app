import type {
  PresentationTaskSlideBlock,
  PresentationTaskSlideFrame,
} from "@/types/task";
import {
  mergeConsecutiveDuplicateVisualOnlyFrames,
  normalizeFrameTitle,
  resolveVisualImageId,
} from "@/lib/app/presentation/presentationFrameTitleNormalization";
import {
  buildAdaptiveVisualMainAnnotation,
  isAdaptiveVisualMainBodyBlock,
  isMultiVisualMainRequest,
  normalizeAdaptiveVisualMainAnnotation,
} from "@/lib/app/presentation/presentationAdaptiveVisualMainAnnotation";

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

function finalizeFrameNormalization(
  frames: PresentationTaskSlideFrame[]
): PresentationTaskSlideFrame[] {
  return normalizeDenseHeroDetailsFrames(frames).map((frame, index) => ({
    ...frame,
    slideNumber: index + 1,
    title: normalizeFrameTitle(frame.title),
  }));
}

function applyAdaptiveLayoutPolicy(
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

function inferAdaptiveSlideRole(
  frame: PresentationTaskSlideFrame
): PresentationTaskSlideFrame["slideRole"] {
  if (frame.layoutFrameId === "adaptiveVisualMain") return "visualMain";
  if (frame.layoutFrameId === "adaptiveTextMain") return "textMain";
  if (frame.layoutFrameId === "visualLeftTextRight") {
    const visualBlock = frame.blocks[0];
    if (!visualBlock?.visualRequest) return undefined;
    return isVisualMainCandidateBlock(visualBlock) ? "visualMain" : "textMain";
  }
  if (frame.layoutFrameId === "textLeftVisualRight") {
    return frame.blocks.some((block) => !!block.visualRequest) ? "textMain" : undefined;
  }
  if (frame.layoutFrameId === "leftRight50") {
    if (frame.blocks[0]?.visualRequest && !frame.blocks[1]?.visualRequest) {
      return isVisualMainCandidateBlock(frame.blocks[0]) ? "visualMain" : "textMain";
    }
    if (!frame.blocks[0]?.visualRequest && frame.blocks[1]?.visualRequest) {
      return "textMain";
    }
  }
  return undefined;
}

function isVisualMainCandidateBlock(block: PresentationTaskSlideBlock | undefined) {
  const visual = block?.visualRequest;
  if (!visual) return false;
  return (
    visual.type === "diagram" ||
    visual.type === "chart" ||
    visual.type === "table" ||
    visual.type === "map" ||
    visual.type === "iconSet"
  );
}

function normalizeDenseHeroDetailsFrames(
  frames: PresentationTaskSlideFrame[]
): PresentationTaskSlideFrame[] {
  return frames.map((frame) => {
    if (frame.layoutFrameId !== "heroTopDetailsBottom" || frame.blocks.length < 3) {
      return frame;
    }
    const [heroBlock, firstDetail, secondDetail] = frame.blocks;
    if (
      heroBlock.styleId !== "headlineCenter" ||
      (!isDenseTextBlock(firstDetail) && !isDenseTextBlock(secondDetail))
    ) {
      return frame;
    }

    const title = blockText(heroBlock) || frame.title;
    const speakerIntent = [frame.speakerIntent, blockText(heroBlock)]
      .filter(Boolean)
      .join("\n");

    return {
      ...frame,
      title,
      layoutFrameId: "leftRight50",
      speakerIntent: speakerIntent || frame.speakerIntent,
      blocks: [firstDetail, secondDetail],
    };
  });
}

function hasLargeNeighboringText(
  blocks: PresentationTaskSlideBlock[],
  visualBlock: PresentationTaskSlideBlock
) {
  return blocks.some((block) => {
    if (block === visualBlock || block.visualRequest) return false;
    return isDenseTextBlock(block);
  });
}

function isDenseTextBlock(block: PresentationTaskSlideBlock | undefined) {
  if (!block || block.visualRequest) return false;
  const textLength = [block.heading, block.text, ...(block.items || [])]
    .filter(Boolean)
    .join("")
    .length;
  return textLength >= 80 || (block.items?.length || 0) >= 4;
}

function blockText(block: PresentationTaskSlideBlock | undefined) {
  return [block?.heading, block?.text].filter(Boolean).join(" ").trim();
}

