import type {
  PresentationTaskSlideFrame,
} from "@/types/task";
import type {
  PresentationSpec,
  SlideSpec,
} from "@/lib/app/presentation/presentationTypes";
import {
  blockMessage,
  blockToBullets,
  blockToCard,
  blockVisualText,
  buildColumn,
  visualBlock,
} from "@/lib/app/presentation/presentationSlideFrameBlockSpec";

export function buildPresentationSpecFromSlideFrames(args: {
  title: string;
  frames: PresentationTaskSlideFrame[];
  strategyItems?: string[];
}): PresentationSpec {
  return {
    version: "0.1",
    title: args.title || "Presentation",
    language: "ja",
    audience: findStrategyValue(args.strategyItems || [], "audience"),
    purpose: findStrategyValue(args.strategyItems || [], "purpose"),
    theme: "business-clean",
    density: "standard",
    slides: args.frames.map((frame) => buildSlideSpecFromFrame(frame)),
  };
}

export function buildSlideSpecFromFrame(frame: PresentationTaskSlideFrame): SlideSpec {
  if (frame.layoutFrameId === "singleCenter") {
    const primary = frame.blocks[0];
    return {
      type: "title",
      title: frame.title,
      subtitle: blockMessage(primary) || undefined,
      keyVisual: blockVisualText(primary) || visualBlock(frame)?.visualRequest?.brief,
      notes: frame.speakerIntent,
    };
  }

  if (
    frame.layoutFrameId === "visualLeftTextRight" ||
    frame.layoutFrameId === "textLeftVisualRight" ||
    frame.layoutFrameId === "leftRight50" ||
    frame.layoutFrameId === "adaptiveVisualMain" ||
    frame.layoutFrameId === "adaptiveTextMain"
  ) {
    const [first, second] = frame.blocks;
    return {
      type: "twoColumn",
      title: frame.title,
      layoutVariant:
        frame.layoutFrameId === "visualLeftTextRight" ||
        frame.layoutFrameId === "adaptiveVisualMain"
          ? "visualLeftTextRight"
          : frame.layoutFrameId === "textLeftVisualRight" ||
              frame.layoutFrameId === "adaptiveTextMain"
            ? "textLeftVisualRight"
            : undefined,
      left: buildColumn(first, "Left"),
      right: buildColumn(second, "Right"),
      takeaway: frame.blocks.find((block) => block.kind === "callout")?.text,
      notes: frame.speakerIntent,
    };
  }

  if (
    frame.layoutFrameId === "threeColumns" ||
    frame.layoutFrameId === "twoByTwoGrid" ||
    frame.layoutFrameId === "heroTopDetailsBottom"
  ) {
    return {
      type: "cards",
      title: frame.title,
      layoutVariant: frame.layoutFrameId,
      cards: frame.blocks.map(blockToCard),
      notes: frame.speakerIntent,
    };
  }

  const bullets = frame.blocks.flatMap(blockToBullets);
  return {
    type: "bullets",
    title: frame.title,
    lead: blockMessage(frame.blocks[0]) || undefined,
    bullets: bullets.length > 0 ? bullets : [{ text: "Content to be refined" }],
    takeaway: frame.blocks.find((block) => block.kind === "callout")?.text,
    notes: frame.speakerIntent,
  };
}

function findStrategyValue(items: string[], key: string) {
  const matched = items.find((item) =>
    item.toLowerCase().startsWith(`${key.toLowerCase()}:`)
  );
  return matched?.replace(new RegExp(`^${key}\\s*:\\s*`, "i"), "").trim() || undefined;
}
