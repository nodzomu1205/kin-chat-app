import type {
  PresentationTaskSlideBlock,
  PresentationTaskSlideFrame,
  PresentationTaskVisualMatch,
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
};

export type EditedVisualSlot = {
  need?: string;
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

function mergeEditedBlock(
  block: PresentationTaskSlideBlock,
  edited: EditedBlock | undefined
): PresentationTaskSlideBlock {
  if (!edited) return block;
  if (block.visualRequest) {
    if (!edited.visualSlotsSeen) {
      return {
        ...block,
        visualRequest: {
          ...block.visualRequest,
          visualSlots: undefined,
          selectionMatches: undefined,
        },
      };
    }
    const visualSlots = mergeEditedVisualSlots(
      block.visualRequest.visualSlots || [],
      edited.visualSlots
    );
    return {
      ...block,
      visualRequest: {
        ...block.visualRequest,
        visualSlots: visualSlots.length > 0 ? visualSlots : undefined,
        labels:
          visualSlots.length > 0
            ? visualSlots.map((slot) => slot.label)
            : block.visualRequest.labels,
        selectionMatches: rebaseEditedSelectionMatches(
          block.visualRequest.selectionMatches,
          visualSlots
        ),
      },
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

function mergeEditedVisualSlots(
  originalSlots: PresentationTaskVisualSlot[],
  editedSlots: EditedVisualSlot[]
): PresentationTaskVisualSlot[] {
  const slots: PresentationTaskVisualSlot[] = [];
  editedSlots.forEach((edited, index) => {
    const original = originalSlots[index];
    const label = edited.label?.trim() || original?.label || edited.need?.trim() || "";
    const need = edited.need?.trim() || original?.need || label;
    if (!label && !need) return;
    slots.push({
      ...(original || {}),
      slotId: original?.slotId || `slot${index + 1}`,
      order: original?.order || index + 1,
      label,
      need,
    });
  });
  return slots;
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
