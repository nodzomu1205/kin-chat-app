import type {
  PresentationTaskPlan,
  PresentationTaskSlideBlock,
  PresentationTaskSlideFrame,
  PresentationTaskVisualMatch,
  PresentationTaskVisualSlot,
} from "@/types/task";

type EditedFrame = {
  slideNumber: number;
  title: string;
  blocks: EditedBlock[];
};

type EditedBlock = {
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

type EditedVisualSlot = {
  need?: string;
  label?: string;
};

export function syncPresentationPlanStructuredPayloadFromEditedText(args: {
  plan: PresentationTaskPlan;
  title?: string;
  text: string;
  updatedAt?: string;
}): PresentationTaskPlan {
  const editedFrames = parseEditedPresentationFrames(args.text);
  if (editedFrames.length === 0 || args.plan.slideFrames.length === 0) {
    return {
      ...args.plan,
      title: args.title?.trim() || args.plan.title,
      updatedAt: args.updatedAt || args.plan.updatedAt,
    };
  }
  const editedBySlideNumber = new Map(
    editedFrames.map((frame) => [frame.slideNumber, frame])
  );
  const slideFrames = args.plan.slideFrames.map((frame, index) => {
    const edited = editedBySlideNumber.get(frame.slideNumber) || editedFrames[index];
    return edited ? mergeEditedFrame(frame, edited) : frame;
  });
  return {
    ...args.plan,
    title: args.title?.trim() || args.plan.title,
    slideFrames,
    updatedAt: args.updatedAt || args.plan.updatedAt,
  };
}

function parseEditedPresentationFrames(text: string): EditedFrame[] {
  const frames: EditedFrame[] = [];
  let currentFrame: EditedFrame | null = null;
  let currentBlock: EditedBlock | null = null;
  let currentSlot: EditedVisualSlot | null = null;
  let collectingItems = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = stripDisplayBullets(rawLine);
    if (!line) continue;

    const slideMatch = line.match(/^Slide\s+(\d+):\s*(.*)$/i);
    if (slideMatch) {
      currentFrame = {
        slideNumber: Number(slideMatch[1]),
        title: slideMatch[2]?.trim() || "",
        blocks: [],
      };
      frames.push(currentFrame);
      currentBlock = null;
      currentSlot = null;
      collectingItems = false;
      continue;
    }

    const blockMatch = line.match(/^(\S+)\s+([A-Za-z]+)\s+\(([^)]+)\)$/);
    if (blockMatch && currentFrame) {
      currentBlock = {
        id: blockMatch[1],
        headingSeen: false,
        textSeen: false,
        itemsSeen: false,
        items: [],
        visualSlotsSeen: false,
        visualSlots: [],
      };
      currentFrame.blocks.push(currentBlock);
      currentSlot = null;
      collectingItems = false;
      continue;
    }

    if (!currentBlock) continue;

    if (/^Visual slot\s+\d+:/i.test(line)) {
      currentBlock.visualSlotsSeen = true;
      currentSlot = {};
      currentBlock.visualSlots.push(currentSlot);
      collectingItems = false;
      continue;
    }

    const field = splitDisplayField(line);
    if (!field) {
      if (collectingItems) currentBlock.items.push(line);
      continue;
    }
    collectingItems = false;

    if (currentSlot) {
      if (isSelectedImageField(field.label)) continue;
      if (currentSlot.need === undefined) {
        currentSlot.need = field.value;
      } else if (currentSlot.label === undefined) {
        currentSlot.label = field.value;
      }
      continue;
    }

    if (isHeadingField(field.label)) {
      currentBlock.headingSeen = true;
      currentBlock.heading = field.value;
      continue;
    }
    if (isItemsField(field.label) || (!field.value && currentBlock.textSeen)) {
      currentBlock.itemsSeen = true;
      if (field.value) currentBlock.items.push(field.value);
      collectingItems = true;
      continue;
    }
    if (isBodyField(field.label) || !currentBlock.textSeen) {
      currentBlock.textSeen = true;
      currentBlock.text = field.value;
    }
  }

  return frames;
}

function mergeEditedFrame(
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

function stripDisplayBullets(value: string) {
  let line = value.trim();
  while (line.startsWith("-")) {
    line = line.slice(1).trimStart();
  }
  return line.trim();
}

function splitDisplayField(line: string) {
  const separator = line.indexOf(":");
  if (separator < 0) return null;
  return {
    label: line.slice(0, separator).trim(),
    value: line.slice(separator + 1).trim(),
  };
}

function isHeadingField(label: string) {
  return /heading|display heading|表示見出し|見出し/i.test(label);
}

function isBodyField(label: string) {
  return /body|text|display body|表示本文|本文/i.test(label);
}

function isItemsField(label: string) {
  return /items?|bullet|display items|表示項目|項目/i.test(label);
}

function isSelectedImageField(label: string) {
  return /selected|image|選択済み画像/i.test(label);
}
