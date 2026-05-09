import type {
  PresentationTaskSlideBlock,
  PresentationTaskSlideFrame,
} from "@/types/task";
import type {
  BulletItem,
  CardContent,
  ColumnContent,
} from "@/lib/app/presentation/presentationTypes";

export function buildColumn(
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

export function blockToCard(block: PresentationTaskSlideBlock): CardContent {
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

export function blockToBullets(
  block: PresentationTaskSlideBlock | undefined
): BulletItem[] {
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

export function visualBlock(frame: PresentationTaskSlideFrame) {
  return frame.blocks.find((block) => block.visualRequest);
}

export function blockMessage(block: PresentationTaskSlideBlock | undefined) {
  if (!block) return "";
  return block.text || "";
}

export function blockVisualText(block: PresentationTaskSlideBlock | undefined) {
  if (!block?.visualRequest) return "";
  return block.visualRequest.brief || block.visualRequest.prompt || "";
}
