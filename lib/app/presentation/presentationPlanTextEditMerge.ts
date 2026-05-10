import type {
  PresentationTaskBookendSlide,
  PresentationTaskDeckFrame,
  PresentationTaskSlideBlock,
  PresentationTaskSlideFrame,
} from "@/types/task";
import {
  mergeEditedVisualRequest,
  type EditedVisualRequest,
  type EditedVisualSlot,
} from "@/lib/app/presentation/presentationPlanTextEditVisualMerge";

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

export type EditedBookendSlide = {
  title?: string;
  visual?: EditedVisualRequest;
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
