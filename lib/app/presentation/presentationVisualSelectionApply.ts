import type { PresentationTaskPlan, PresentationTaskSlideFrame } from "@/types/task";
import type { PresentationVisualSelectionCommand } from "@/lib/app/presentation/presentationVisualSelectionCommandParser";
import { visualResolutionSlots } from "@/lib/app/presentation/presentationVisualResolutionSlots";

export function applyPresentationVisualSelections(
  plan: PresentationTaskPlan,
  selections: PresentationVisualSelectionCommand[]
): PresentationTaskPlan {
  const openingSelections = selections.filter((item) => item.target === "opening");
  const openingBlockSelection = openingSelections.find((item) => !item.slotNumber);
  const updatedPlan: PresentationTaskPlan = {
    ...plan,
    updatedAt: new Date().toISOString(),
    deckFrame:
      openingSelections.length > 0 && plan.deckFrame?.openingSlide?.visualRequest
        ? {
            ...plan.deckFrame,
            openingSlide: {
              ...plan.deckFrame.openingSlide,
              visualRequest: openingBlockSelection
                ? applyVisualImageSelection(
                    plan.deckFrame.openingSlide.visualRequest,
                    openingBlockSelection
                  )
                : applyVisualSlotSelections(
                    plan.deckFrame.openingSlide.visualRequest,
                    openingSelections
                  ),
            },
          }
        : plan.deckFrame,
    slideFrames: plan.slideFrames.map((frame) => {
      const blocks = frame.blocks.map((block, index) => {
        const blockSelections = selections.filter(
          (item) =>
            item.target === "block" &&
            item.slideNumber === frame.slideNumber &&
            item.blockNumber === index + 1
        );
        if (blockSelections.length === 0 || !block.visualRequest) return block;
        const blockSelection = blockSelections.find((item) => !item.slotNumber);
        return {
          ...block,
          visualRequest: blockSelection
            ? applyVisualImageSelection(block.visualRequest, blockSelection)
            : applyVisualSlotSelections(block.visualRequest, blockSelections),
        };
      });
      const primaryImageId =
        blocks.find((block) => block.visualRequest?.preferredImageId)?.visualRequest
          ?.preferredImageId || undefined;
      return {
        ...frame,
        blocks,
        layoutIntent: {
          ...frame.layoutIntent,
          primaryImageId,
        },
      };
    }),
  };
  return updatedPlan;
}

function applyVisualImageSelection(
  visual: NonNullable<PresentationTaskSlideFrame["blocks"][number]["visualRequest"]>,
  selection: PresentationVisualSelectionCommand
) {
  if (selection.off) {
    return {
      ...visual,
      preferredImageId: undefined,
      candidateImageIds: undefined,
      selectionMatches: undefined,
      asset: undefined,
    };
  }
  if (selection.imageIds.length === 0) return visual;
  const firstSlot = visualResolutionSlots(visual)[0];
  const label = firstSlot?.label || visual.labels?.[0] || visual.brief || "visual";
  const slotId = firstSlot?.slotId || label;
  const need = firstSlot?.need || visual.prompt || visual.brief || label;
  const usagePolicy =
    selection.imageIds.length > 1
      ? ("useOneOrMore" as const)
      : ("useOneBest" as const);
  return {
    ...visual,
    preferredImageId: selection.imageIds[0],
    candidateImageIds: selection.imageIds,
    usagePolicy,
    maxVisualItems: selection.imageIds.length,
    selectionMatches: selection.imageIds.map((imageId) => ({
      slotId,
      label,
      need,
      status: "selected" as const,
      imageId,
      score: 1,
      threshold: 1,
    })),
  };
}

function applyVisualSlotSelections(
  visual: NonNullable<PresentationTaskSlideFrame["blocks"][number]["visualRequest"]>,
  selections: PresentationVisualSelectionCommand[]
) {
  const slots = visualResolutionSlots(visual);
  if (slots.length === 0) return visual;
  const selectedSlotNumbers = new Set(
    selections
      .map((selection) => selection.slotNumber)
      .filter((slotNumber): slotNumber is number => typeof slotNumber === "number")
  );
  const preservedMatches = (visual.selectionMatches || []).filter((match) => {
    const slotIndex = slots.findIndex((slot) => slot.slotId === match.slotId);
    return slotIndex < 0 || !selectedSlotNumbers.has(slotIndex + 1);
  });
  const nextMatches = [...preservedMatches];
  for (const selection of selections) {
    if (!selection.slotNumber) continue;
    const slot = slots[selection.slotNumber - 1];
    if (!slot || selection.off) continue;
    const imageId = selection.imageIds[0]?.trim();
    if (!imageId) continue;
    nextMatches.push({
      slotId: slot.slotId,
      label: slot.label,
      need: slot.need,
      status: "selected" as const,
      imageId,
      score: 1,
      threshold: 1,
    });
  }
  const selectedMatches = slots.flatMap((slot) => {
    const match = nextMatches.find(
      (item) => item.slotId === slot.slotId && item.status === "selected" && item.imageId
    );
    return match ? [match] : [];
  });
  const imageIds = selectedMatches.map((match) => match.imageId as string);
  return {
    ...visual,
    preferredImageId: imageIds[0],
    candidateImageIds: imageIds.length > 0 ? imageIds : undefined,
    usagePolicy:
      imageIds.length > 1
        ? ("useOneOrMore" as const)
        : imageIds.length === 1
          ? ("useOneBest" as const)
          : undefined,
    maxVisualItems: imageIds.length > 0 ? imageIds.length : undefined,
    labels:
      selectedMatches.length > 0
        ? selectedMatches.map((match) => match.label).filter(Boolean)
        : visual.labels,
    selectionMatches: nextMatches.length > 0 ? nextMatches : undefined,
    asset: undefined,
  };
}
