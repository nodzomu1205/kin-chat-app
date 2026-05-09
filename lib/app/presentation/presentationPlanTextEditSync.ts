import type {
  PresentationTaskPlan,
} from "@/types/task";
import {
  mergeEditedFrame,
  type EditedBlock,
  type EditedFrame,
  type EditedVisualSlot,
} from "@/lib/app/presentation/presentationPlanTextEditMerge";

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
