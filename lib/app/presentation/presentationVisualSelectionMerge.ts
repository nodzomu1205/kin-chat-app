import { collectSelectedVisualImageIds } from "@/lib/app/presentation/presentationPlanChatDisplay";
import { preserveExistingVisualSelectionIfMissing } from "@/lib/app/presentation/presentationVisualSelectionPreserve";
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
