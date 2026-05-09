import type {
  PresentationTaskVisualRequest,
  PresentationTaskVisualSlot,
} from "@/types/task";

export function hasUserConfirmedVisualSelection(
  visual: PresentationTaskVisualRequest
) {
  const selectedIds = selectedVisualImageIdSet(visual);
  if (selectedIds.size === 0) return false;
  return (visual.selectionMatches || []).some(
    (match) =>
      match.status === "selected" &&
      !!match.imageId?.trim() &&
      selectedIds.has(match.imageId.trim())
  );
}

export function hasSelectedVisualImageIds(visual: PresentationTaskVisualRequest) {
  return selectedVisualImageIdSet(visual).size > 0;
}

function selectedVisualImageIdSet(visual: PresentationTaskVisualRequest) {
  return new Set(
    [visual.preferredImageId, ...(visual.candidateImageIds || [])]
      .filter((imageId): imageId is string => !!imageId?.trim())
      .map((imageId) => imageId.trim())
  );
}

export function normalizeSlots(slots: PresentationTaskVisualSlot[] | undefined) {
  return (slots || [])
    .filter((slot) => slot.need.trim() || slot.label.trim())
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}
