import type {
  PresentationTaskBookendSlide,
  PresentationTaskDeckFrame,
  PresentationTaskSlideBlock,
  PresentationTaskSlideFrame,
  PresentationTaskVisualMatch,
  PresentationTaskVisualRequest,
  PresentationTaskVisualSlot,
} from "@/types/task";

export type EditedFrame = {
  slideNumber: number;
  title: string;
  blocks: EditedBlock[];
};

export type EditedBlock = {
  id: string;
  headingSeen: boolean;
  heading?: string;
  textSeen: boolean;
  text?: string;
  itemsSeen: boolean;
  items: string[];
  visualSlotsSeen: boolean;
  visualSlots: EditedVisualSlot[];
  promptSeen?: boolean;
  prompt?: string;
  labelSeen?: boolean;
  label?: string;
};

export type EditedVisualSlot = {
  needSeen?: boolean;
  need?: string;
  labelSeen?: boolean;
  label?: string;
};

export type EditedBookendSlide = {
  title?: string;
  visual?: EditedVisualRequest;
};

export type EditedVisualRequest = {
  visualSlotsSeen: boolean;
  visualSlots: EditedVisualSlot[];
  promptSeen?: boolean;
  prompt?: string;
  labelSeen?: boolean;
  label?: string;
};

export function mergeEditedFrame(
  frame: PresentationTaskSlideFrame,
  edited: EditedFrame
): PresentationTaskSlideFrame {
  const originalById = new Map(frame.blocks.map((block) => [block.id, block]));
  const editedById = new Map(edited.blocks.map((block) => [block.id, block]));
  const blocks =
    edited.blocks.length > 0
      ? edited.blocks
          .map((block) => originalById.get(block.id))
          .filter((block): block is PresentationTaskSlideBlock => !!block)
          .map((block) => mergeEditedBlock(block, editedById.get(block.id)))
      : frame.blocks;
  return {
    ...frame,
    title: edited.title || frame.title,
    blocks,
  };
}

export function mergeEditedDeckFrame(
  deckFrame: PresentationTaskDeckFrame | undefined,
  edited: {
    openingSlide?: EditedBookendSlide;
    closingSlide?: EditedBookendSlide;
  }
): PresentationTaskDeckFrame | undefined {
  if (!deckFrame) return deckFrame;
  return {
    ...deckFrame,
    openingSlide: mergeEditedBookendSlide(
      deckFrame.openingSlide,
      edited.openingSlide
    ),
    closingSlide: mergeEditedBookendSlide(
      deckFrame.closingSlide,
      edited.closingSlide
    ),
  };
}

function mergeEditedBlock(
  block: PresentationTaskSlideBlock,
  edited: EditedBlock | undefined
): PresentationTaskSlideBlock {
  if (!edited) return block;
  if (block.visualRequest) {
    return {
      ...block,
      visualRequest: mergeEditedVisualRequest(block.visualRequest, edited),
    };
  }
  return {
    ...block,
    heading: edited.headingSeen ? edited.heading || undefined : undefined,
    text: edited.textSeen ? edited.text || undefined : undefined,
    items: edited.itemsSeen
      ? edited.items.map((item) => item.trim()).filter(Boolean)
      : undefined,
  };
}

function mergeEditedBookendSlide(
  slide: PresentationTaskBookendSlide | undefined,
  edited: EditedBookendSlide | undefined
): PresentationTaskBookendSlide | undefined {
  if (!slide || !edited) return slide;
  return {
    ...slide,
    title: edited.title?.trim() || slide.title,
    visualRequest:
      slide.visualRequest && edited.visual
        ? mergeEditedVisualRequest(slide.visualRequest, edited.visual)
        : slide.visualRequest,
  };
}

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
