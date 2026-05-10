import type { PresentationTaskSlideFrame } from "@/types/task";

export function expandMultiVisualCandidateFrame(
  frame: PresentationTaskSlideFrame
): PresentationTaskSlideFrame {
  const textBlocks = frame.blocks.filter((block) => !block.visualRequest);
  const visualBlocks = frame.blocks.filter((block) => !!block.visualRequest);
  if (visualBlocks.length === 0) return frame;
  const expandedVisuals = visualBlocks.flatMap((block) => expandVisualCandidateBlock(block));
  if (frame.layoutFrameId === "adaptiveVisualMain") {
    return {
      ...frame,
      blocks: [...expandedVisuals, ...textBlocks.slice(0, 1)].slice(0, 7),
    };
  }
  if (frame.layoutFrameId !== "adaptiveTextMain") return frame;
  return {
    ...frame,
    blocks: [...textBlocks.slice(0, 1), ...expandedVisuals].slice(0, 7),
  };
}

function expandVisualCandidateBlock(
  block: PresentationTaskSlideFrame["blocks"][number]
): PresentationTaskSlideFrame["blocks"] {
  const visual = block.visualRequest;
  if (!visual) return [block];
  const wantsMultiple =
    visual.usagePolicy === "useOneOrMore" || visual.usagePolicy === "useAsGrid";
  const defaultMaxVisualItems = wantsMultiple
    ? Math.max(1, visual.candidateImageIds?.length || visual.selectionMatches?.filter((match) => match.status === "selected").length || 3)
    : 1;
  const maxVisualItems = Math.max(
    1,
    Math.min(6, visual.maxVisualItems || defaultMaxVisualItems)
  );
  const imageIds = Array.from(
    new Set([visual.preferredImageId, ...(visual.candidateImageIds || [])].filter(Boolean))
  ).slice(0, maxVisualItems) as string[];
  const matchesByImageId = new Map(
    (visual.selectionMatches || [])
      .filter((match) => match.status === "selected" && match.imageId)
      .map((match) => [match.imageId as string, match])
  );
  const hiddenLabelSlotIds = new Set(visual.renderStyle?.hiddenLabelSlotIds || []);
  const alignedLabels =
    visual.labels && visual.labels.length === imageIds.length ? visual.labels : undefined;
  const labelForImage = (imageId: string | undefined, index: number) => {
    const match = imageId ? matchesByImageId.get(imageId) : undefined;
    const slotId = match?.slotId || visual.visualSlots?.[index]?.slotId;
    if (slotId && hiddenLabelSlotIds.has(slotId)) return "";
    return alignedLabels?.[index] || match?.label || "";
  };
  if (visual.usagePolicy === "useOneBest" || maxVisualItems <= 1 || imageIds.length <= 1) {
    const label = labelForImage(imageIds[0], 0);
    return [
      {
        ...block,
        visualRequest: {
          ...visual,
          brief: label || visual.brief,
          renderStyle: {
            ...visual.renderStyle,
            showBrief: label ? visual.renderStyle?.showBrief : false,
          },
        },
      },
    ];
  }
  return imageIds.map((imageId, index) => ({
    ...block,
    id: index === 0 ? block.id : `${block.id}_${index + 1}`,
    visualRequest: {
      ...visual,
      brief: labelForImage(imageId, index) || visual.brief,
      preferredImageId: imageId,
      candidateImageIds: imageIds,
      renderStyle: {
        ...visual.renderStyle,
        showBrief: labelForImage(imageId, index) ? visual.renderStyle?.showBrief : false,
      },
    },
  }));
}
