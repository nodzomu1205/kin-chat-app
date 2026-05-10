import type { PresentationTaskPlan } from "@/types/task";
import {
  mergeEditedDeckFrame,
  mergeEditedFrame,
  type EditedBlock,
  type EditedBookendSlide,
  type EditedFrame,
  type EditedVisualRequest,
  type EditedVisualSlot,
} from "@/lib/app/presentation/presentationPlanTextEditMerge";

export function syncPresentationPlanStructuredPayloadFromEditedText(args: {
  plan: PresentationTaskPlan;
  title?: string;
  text: string;
  updatedAt?: string;
}): PresentationTaskPlan {
  const edited = parseEditedPresentationText(args.text);
  if (
    edited.frames.length === 0 &&
    !edited.deckFrame.openingSlide &&
    !edited.deckFrame.closingSlide
  ) {
    return {
      ...args.plan,
      title: args.title?.trim() || args.plan.title,
      updatedAt: args.updatedAt || args.plan.updatedAt,
    };
  }

  const editedBySlideNumber = new Map(
    edited.frames.map((frame) => [frame.slideNumber, frame])
  );
  const slideFrames =
    edited.frames.length > 0
      ? args.plan.slideFrames.map((frame, index) => {
          const editedFrame =
            editedBySlideNumber.get(frame.slideNumber) || edited.frames[index];
          return editedFrame ? mergeEditedFrame(frame, editedFrame) : frame;
        })
      : args.plan.slideFrames;

  return {
    ...args.plan,
    title: args.title?.trim() || args.plan.title,
    deckFrame: mergeEditedDeckFrame(args.plan.deckFrame, edited.deckFrame),
    slideFrames,
    updatedAt: args.updatedAt || args.plan.updatedAt,
  };
}

function parseEditedPresentationText(text: string): {
  frames: EditedFrame[];
  deckFrame: {
    openingSlide?: EditedBookendSlide;
    closingSlide?: EditedBookendSlide;
  };
} {
  const frames: EditedFrame[] = [];
  const deckFrame: {
    openingSlide?: EditedBookendSlide;
    closingSlide?: EditedBookendSlide;
  } = {};
  let currentFrame: EditedFrame | null = null;
  let currentBlock: EditedBlock | null = null;
  let currentBookend: EditedBookendSlide | null = null;
  let currentVisual: EditedVisualRequest | null = null;
  let currentSlot: EditedVisualSlot | null = null;
  let collectingItems = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = stripDisplayBullets(rawLine);
    if (!line) continue;

    const bookendMatch = line.match(
      /^(Opening|Closing)\s+slide:\s*([^/]+?)(?:\s*\/\s*(.*))?$/i
    );
    if (bookendMatch) {
      currentBookend = {
        title: bookendMatch[3]?.trim() || "",
      };
      if (bookendMatch[1].toLowerCase() === "opening") {
        deckFrame.openingSlide = currentBookend;
      } else {
        deckFrame.closingSlide = currentBookend;
      }
      currentFrame = null;
      currentBlock = null;
      currentVisual = null;
      currentSlot = null;
      collectingItems = false;
      continue;
    }

    const slideMatch = line.match(/^Slide\s+(\d+):\s*(.*)$/i);
    if (slideMatch) {
      currentFrame = {
        slideNumber: Number(slideMatch[1]),
        title: slideMatch[2]?.trim() || "",
        blocks: [],
      };
      frames.push(currentFrame);
      currentBookend = null;
      currentBlock = null;
      currentVisual = null;
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
      currentVisual = blockMatch[2].toLowerCase() === "visual" ? currentBlock : null;
      currentSlot = null;
      collectingItems = false;
      continue;
    }

    if (blockMatch && currentBookend && blockMatch[2].toLowerCase() === "visual") {
      currentBookend.visual = createEditedVisualRequest();
      currentVisual = currentBookend.visual;
      currentBlock = null;
      currentSlot = null;
      collectingItems = false;
      continue;
    }

    const activeVisual = currentVisual || (currentBlock?.visualSlots ? currentBlock : null);

    if (/^Visual slot\s+\d+:/i.test(line) && activeVisual) {
      activeVisual.visualSlotsSeen = true;
      currentSlot = {};
      activeVisual.visualSlots.push(currentSlot);
      collectingItems = false;
      continue;
    }

    const field = splitDisplayField(line);
    if (!field) {
      if (collectingItems && currentBlock) currentBlock.items.push(line);
      continue;
    }
    collectingItems = false;

    if (currentSlot) {
      if (isSelectedImageField(field.label)) continue;
      if (isVisualPromptField(field.label) || currentSlot.need === undefined) {
        currentSlot.needSeen = true;
        currentSlot.need = field.value;
      } else if (isVisualLabelField(field.label) || currentSlot.label === undefined) {
        currentSlot.labelSeen = true;
        currentSlot.label = field.value;
      }
      continue;
    }

    if (activeVisual && isSelectedImageField(field.label)) continue;
    if (activeVisual && isVisualPromptField(field.label)) {
      activeVisual.promptSeen = true;
      activeVisual.prompt = field.value;
      continue;
    }
    if (activeVisual && isVisualLabelField(field.label)) {
      activeVisual.labelSeen = true;
      activeVisual.label = field.value;
      continue;
    }

    if (!currentBlock) continue;

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

  return { frames, deckFrame };
}

function createEditedVisualRequest(): EditedVisualRequest {
  return {
    visualSlotsSeen: false,
    visualSlots: [],
  };
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
  return /heading|display heading|表示見出し|見出し|陦ｨ遉ｺ隕句・縺慾隕句・縺・/i.test(label);
}

function isBodyField(label: string) {
  return /body|text|display body|表示本文|本文|陦ｨ遉ｺ譛ｬ譁・譛ｬ譁・/i.test(label);
}

function isItemsField(label: string) {
  return /items?|bullet|display items|表示項目|項目|陦ｨ遉ｺ鬆・岼|鬆・岼/i.test(label);
}

function isSelectedImageField(label: string) {
  return /selected|image|選択済み画像|驕ｸ謚樊ｸ医∩逕ｻ蜒・/i.test(label);
}

function isVisualPromptField(label: string) {
  return /visual\s*prompt|prompt|ビジュアルプロンプト|繝励Ο繝ｳ繝励ヨ/i.test(label);
}

function isVisualLabelField(label: string) {
  return /visual\s*label|label|ビジュアル内表示ラベル|繝ｩ繝吶Ν/i.test(label);
}
