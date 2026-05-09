import type { PresentationTaskSlideBlock } from "@/types/task";

export function selectedImageIdForVisualSlot(
  visual: NonNullable<PresentationTaskSlideBlock["visualRequest"]>,
  slotId: string,
  slotIndex: number
) {
  const match = (visual.selectionMatches || []).find(
    (item) => item.slotId === slotId && item.status === "selected" && item.imageId
  );
  if (match?.imageId) return match.imageId;
  const selectedIds = Array.from(
    new Set([visual.preferredImageId, ...(visual.candidateImageIds || [])].filter(Boolean))
  );
  return selectedIds[slotIndex] || (slotIndex === 0 ? selectedIds[0] || "" : "");
}
