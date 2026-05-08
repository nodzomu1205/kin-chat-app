import type {
  PresentationTaskSlideBlock,
  PresentationTaskSlideFrame,
} from "@/types/task";
import type {
  BulletItem,
  CardContent,
  ColumnContent,
  PresentationSpec,
  SlideSpec,
} from "@/lib/app/presentation/presentationTypes";

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

function buildColumn(
  block: PresentationTaskSlideBlock | undefined,
  fallbackHeading: string
): ColumnContent {
  if (!block) {
    return { heading: fallbackHeading, bullets: [{ text: "Content to be refined" }] };
  }
  const visualText = blockVisualText(block);
  if (block.visualRequest) {
    return {
      heading: visualText || fallbackHeading,
      bullets: blockToBullets(block),
    };
  }
  return {
    heading: block.heading || visualText || fallbackHeading,
    body: block.text,
    bullets: blockToBullets(block),
  };
}

function blockToCard(block: PresentationTaskSlideBlock): CardContent {
  const visualText = blockVisualText(block);
  return {
    title: block.heading || visualText || block.id,
    body: block.text || undefined,
    bullets: blockToBullets(block),
    kind: block.visualRequest
      ? "visual"
      : block.kind === "callout" || block.styleId === "callout"
        ? "callout"
        : "text",
  };
}

function blockToBullets(block: PresentationTaskSlideBlock | undefined): BulletItem[] {
  if (!block) return [];
  const bullets: BulletItem[] = [];
  (block.items || []).forEach((text) => bullets.push({ text }));
  if (block.visualRequest?.prompt) {
    bullets.push({ text: `Prompt: ${block.visualRequest.prompt}`, emphasis: "muted" });
  } else if (block.visualRequest?.promptNote) {
    bullets.push({
      text: `Prompt needed: ${block.visualRequest.promptNote}`,
      emphasis: "muted",
    });
  }
  if (block.visualRequest?.labels?.length) {
    bullets.push({ text: `Labels: ${block.visualRequest.labels.join(", ")}`, emphasis: "muted" });
  }
  return bullets;
}

function visualBlock(frame: PresentationTaskSlideFrame) {
  return frame.blocks.find((block) => block.visualRequest);
}

function blockMessage(block: PresentationTaskSlideBlock | undefined) {
  if (!block) return "";
  return block.text || "";
}

function blockVisualText(block: PresentationTaskSlideBlock | undefined) {
  if (!block?.visualRequest) return "";
  return block.visualRequest.brief || block.visualRequest.prompt || "";
}

function findStrategyValue(items: string[], key: string) {
  const matched = items.find((item) =>
    item.toLowerCase().startsWith(`${key.toLowerCase()}:`)
  );
  return matched?.replace(new RegExp(`^${key}\\s*:\\s*`, "i"), "").trim() || undefined;
}
