import { collectSelectedVisualImageIds } from "@/lib/app/presentation/presentationPlanChatDisplay";
import { visualResolutionSlots } from "@/lib/app/presentation/presentationVisualSelectionCommands";
import type { PresentationTaskSlideFrame } from "@/types/task";

export function preserveExistingVisualSelectionIfMissing(args: {
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
