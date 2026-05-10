import type {
  PresentationTaskVisualMatch,
  PresentationTaskVisualRequest,
  PresentationTaskVisualSlot,
} from "@/types/task";

export type EditedVisualSlot = {
  needSeen?: boolean;
  need?: string;
  labelSeen?: boolean;
  label?: string;
};

export type EditedVisualRequest = {
  visualSlotsSeen: boolean;
  visualSlots: EditedVisualSlot[];
  promptSeen?: boolean;
  prompt?: string;
  labelSeen?: boolean;
  label?: string;
};

export function mergeEditedVisualRequest(
  visual: PresentationTaskVisualRequest,
  edited: EditedVisualRequest
): PresentationTaskVisualRequest {
  let next: PresentationTaskVisualRequest = { ...visual };
  if (edited.promptSeen) {
    const prompt = edited.prompt?.trim() || "";
    next = {
      ...next,
      prompt: prompt || undefined,
    };
  }
  if (edited.labelSeen) {
    const label = edited.label?.trim() || "";
    next = label
      ? {
          ...next,
          brief: label,
          labels: [label],
          renderStyle: {
            ...next.renderStyle,
            showBrief: next.renderStyle?.showBrief,
          },
        }
      : {
          ...next,
          labels: undefined,
          renderStyle: {
            ...next.renderStyle,
            showBrief: false,
          },
        };
  }
  if (
    !edited.visualSlotsSeen &&
    !edited.promptSeen &&
    !edited.labelSeen &&
    visual.visualSlots?.length
  ) {
    return {
      ...next,
      visualSlots: undefined,
      selectionMatches: undefined,
    };
  }
  if (!edited.visualSlotsSeen) {
    return next;
  }
  if (edited.visualSlots.length === 0) {
    return {
      ...next,
      visualSlots: undefined,
      selectionMatches: undefined,
      labels: undefined,
      renderStyle: clearHiddenLabelSlotIds(next.renderStyle),
    };
  }
  const merged = mergeEditedVisualSlots(next.visualSlots || [], edited.visualSlots);
  const visualSlots = merged.slots;
  return {
    ...next,
    visualSlots: visualSlots.length > 0 ? visualSlots : undefined,
    labels:
      visualSlots.length > 0
        ? visualSlots.map((slot) => slot.label)
        : next.labels,
    selectionMatches: rebaseEditedSelectionMatches(
      next.selectionMatches,
      visualSlots
    ),
    renderStyle: setHiddenLabelSlotIds(
      next.renderStyle,
      merged.hiddenLabelSlotIds
    ),
  };
}

function mergeEditedVisualSlots(
  originalSlots: PresentationTaskVisualSlot[],
  editedSlots: EditedVisualSlot[]
): { slots: PresentationTaskVisualSlot[]; hiddenLabelSlotIds: string[] } {
  const slots: PresentationTaskVisualSlot[] = [];
  const hiddenLabelSlotIds: string[] = [];
  editedSlots.forEach((edited, index) => {
    const original = originalSlots[index];
    const explicitLabel = edited.labelSeen ? edited.label?.trim() || "" : undefined;
    const label =
      explicitLabel ||
      original?.label ||
      edited.need?.trim() ||
      original?.need ||
      "";
    const need =
      edited.needSeen
        ? edited.need?.trim() || original?.need || label
        : original?.need || edited.need?.trim() || label;
    if (!label && !need) return;
    const slot = {
      ...(original || {}),
      slotId: original?.slotId || `slot${index + 1}`,
      order: original?.order || index + 1,
      label,
      need,
    };
    slots.push(slot);
    if (edited.labelSeen && !explicitLabel) {
      hiddenLabelSlotIds.push(slot.slotId);
    } else if (!edited.labelSeen && original?.label) {
      hiddenLabelSlotIds.push(slot.slotId);
    }
  });
  return { slots, hiddenLabelSlotIds };
}

function rebaseEditedSelectionMatches(
  matches: PresentationTaskVisualMatch[] | undefined,
  slots: PresentationTaskVisualSlot[]
) {
  if (!matches?.length || slots.length === 0) return undefined;
  const slotsById = new Map(slots.map((slot) => [slot.slotId, slot]));
  const nextMatches = matches
    .filter((match) => slotsById.has(match.slotId))
    .map((match) => {
      const slot = slotsById.get(match.slotId);
      return slot
        ? {
            ...match,
            label: slot.label,
            need: slot.need,
          }
        : match;
    });
  return nextMatches.length > 0 ? nextMatches : undefined;
}

function setHiddenLabelSlotIds(
  renderStyle: PresentationTaskVisualRequest["renderStyle"],
  hiddenLabelSlotIds: string[]
) {
  if (hiddenLabelSlotIds.length === 0) return clearHiddenLabelSlotIds(renderStyle);
  return {
    ...renderStyle,
    hiddenLabelSlotIds,
  };
}

function clearHiddenLabelSlotIds(
  renderStyle: PresentationTaskVisualRequest["renderStyle"]
) {
  if (!renderStyle || !("hiddenLabelSlotIds" in renderStyle)) return renderStyle;
  const { hiddenLabelSlotIds: _hiddenLabelSlotIds, ...rest } = renderStyle as
    PresentationTaskVisualRequest["renderStyle"] & {
      hiddenLabelSlotIds?: string[];
    };
  return rest;
}
