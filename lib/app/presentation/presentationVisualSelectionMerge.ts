import { collectSelectedVisualImageIds } from "@/lib/app/presentation/presentationPlanChatDisplay";
import { visualResolutionSlots } from "@/lib/app/presentation/presentationVisualSelectionCommands";
import type { PresentationTaskPlan, PresentationTaskSlideFrame } from "@/types/task";

export function mergeVisualSelectionProposal<
  T extends NonNullable<
    PresentationTaskSlideFrame["blocks"][number]["visualRequest"]
  >
>(originalVisual: T | undefined, proposedVisual: T): T {
  if (!originalVisual) return proposedVisual;
  const originalSelectedImageIds = collectSelectedVisualImageIds(originalVisual);
  if (originalSelectedImageIds.length > 0) {
    return {
      ...originalVisual,
      visualSlots: originalVisual.visualSlots || proposedVisual.visualSlots,
    };
  }
  return {
    ...originalVisual,
    preferredImageId: proposedVisual.preferredImageId,
    candidateImageIds: proposedVisual.candidateImageIds,
    selectionMatches: proposedVisual.selectionMatches,
    usagePolicy: proposedVisual.usagePolicy,
    maxVisualItems: proposedVisual.maxVisualItems,
    asset: proposedVisual.asset,
  };
}

export function mergePresentationPlanVisualSelections(args: {
  incomingPlan: PresentationTaskPlan;
  existingPlan: PresentationTaskPlan;
}): PresentationTaskPlan {
  return {
    ...args.incomingPlan,
    deckFrame: mergeDeckFrameVisualSelections({
      incomingDeckFrame: args.incomingPlan.deckFrame,
      existingDeckFrame: args.existingPlan.deckFrame,
    }),
    slideFrames: args.incomingPlan.slideFrames.map((incomingFrame) => {
      const existingFrame =
        args.existingPlan.slideFrames.find(
          (frame) => frame.slideNumber === incomingFrame.slideNumber
        ) || null;
      if (!existingFrame) return incomingFrame;
      return {
        ...incomingFrame,
        blocks: incomingFrame.blocks.map((incomingBlock, index) => {
          const existingBlock =
            existingFrame.blocks.find(
              (block) => block.id && block.id === incomingBlock.id
            ) || existingFrame.blocks[index];
          if (!incomingBlock.visualRequest || !existingBlock?.visualRequest) {
            return incomingBlock;
          }
          return {
            ...incomingBlock,
            visualRequest: preserveExistingVisualSelectionIfMissing({
              incomingVisual: incomingBlock.visualRequest,
              existingVisual: existingBlock.visualRequest,
            }),
          };
        }),
      };
    }),
  };
}

function mergeDeckFrameVisualSelections(args: {
  incomingDeckFrame: PresentationTaskPlan["deckFrame"];
  existingDeckFrame: PresentationTaskPlan["deckFrame"];
}) {
  if (
    !args.incomingDeckFrame?.openingSlide?.visualRequest ||
    !args.existingDeckFrame?.openingSlide?.visualRequest
  ) {
    return args.incomingDeckFrame;
  }
  return {
    ...args.incomingDeckFrame,
    openingSlide: {
      ...args.incomingDeckFrame.openingSlide,
      visualRequest: preserveExistingVisualSelectionIfMissing({
        incomingVisual: args.incomingDeckFrame.openingSlide.visualRequest,
        existingVisual: args.existingDeckFrame.openingSlide.visualRequest,
      }),
    },
  };
}

function preserveExistingVisualSelectionIfMissing(args: {
  incomingVisual: NonNullable<PresentationTaskSlideFrame["blocks"][number]["visualRequest"]>;
  existingVisual: NonNullable<PresentationTaskSlideFrame["blocks"][number]["visualRequest"]>;
}) {
  if (collectSelectedVisualImageIds(args.incomingVisual).length > 0) {
    return args.incomingVisual;
  }
  if (collectSelectedVisualImageIds(args.existingVisual).length === 0) {
    return args.incomingVisual;
  }
  const rebasedMatches = rebaseExistingSelectionMatches({
    incomingVisual: args.incomingVisual,
    existingVisual: args.existingVisual,
  });
  return {
    ...args.incomingVisual,
    preferredImageId: args.existingVisual.preferredImageId,
    candidateImageIds: args.existingVisual.candidateImageIds,
    selectionMatches: rebasedMatches || args.existingVisual.selectionMatches,
    usagePolicy: args.existingVisual.usagePolicy,
    maxVisualItems: args.existingVisual.maxVisualItems,
  };
}

function rebaseExistingSelectionMatches(args: {
  incomingVisual: NonNullable<PresentationTaskSlideFrame["blocks"][number]["visualRequest"]>;
  existingVisual: NonNullable<PresentationTaskSlideFrame["blocks"][number]["visualRequest"]>;
}) {
  const incomingSlots = visualResolutionSlots(args.incomingVisual);
  const existingSlots = visualResolutionSlots(args.existingVisual);
  const existingMatches = (args.existingVisual.selectionMatches || []).filter(
    (match) => match.status === "selected" && match.imageId
  );
  const selectedImageIds = collectSelectedVisualImageIds(args.existingVisual);
  const baseMatches =
    existingMatches.length > 0
      ? existingMatches
      : selectedImageIds.map((imageId, index) => ({
          slotId: incomingSlots[index]?.slotId || existingSlots[index]?.slotId || `slot${index + 1}`,
          label:
            incomingSlots[index]?.label ||
            args.incomingVisual.labels?.[index] ||
            existingSlots[index]?.label ||
            args.existingVisual.labels?.[index] ||
            args.existingVisual.brief ||
            "visual",
          need:
            incomingSlots[index]?.need ||
            existingSlots[index]?.need ||
            args.incomingVisual.prompt ||
            args.incomingVisual.brief ||
            args.existingVisual.prompt ||
            args.existingVisual.brief ||
            "visual",
          status: "selected" as const,
          imageId,
          score: 1,
          threshold: 1,
        }));
  if (baseMatches.length === 0) return undefined;
  return baseMatches.map((match, index) => {
    const incomingSlot =
      incomingSlots.find((slot) => slot.slotId === match.slotId) ||
      incomingSlots[index];
    const existingSlot =
      existingSlots.find((slot) => slot.slotId === match.slotId) ||
      existingSlots[index];
    return {
      ...match,
      slotId: incomingSlot?.slotId || match.slotId,
      label:
        incomingSlot?.label ||
        args.incomingVisual.labels?.[index] ||
        match.label,
      need:
        incomingSlot?.need ||
        existingSlot?.need ||
        args.incomingVisual.prompt ||
        args.incomingVisual.brief ||
        match.need,
    };
  });
}
