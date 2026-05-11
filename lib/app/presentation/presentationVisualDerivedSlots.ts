import type {
  PresentationTaskSlideBlock,
  PresentationTaskSlideFrame,
  PresentationTaskVisualSlot,
} from "@/types/task";
import { tokenize } from "@/lib/app/presentation/presentationVisualSelectionScoring";

export function deriveVisualSlotsFromFrame(
  block: PresentationTaskSlideBlock,
  frame: PresentationTaskSlideFrame
): PresentationTaskVisualSlot[] {
  const visual = block.visualRequest;
  if (!visual) return [];
  const visualSegments = splitVisualNeedSegments([visual.brief, visual.prompt].filter(Boolean).join(" "));
  const textItems = frame.blocks
    .filter((item) => item !== block && !item.visualRequest)
    .flatMap((item) => [item.heading, item.text, ...(item.items || [])])
    .filter((item): item is string => !!item?.trim());
  const itemLabels = frame.blocks
    .filter((item) => item !== block && !item.visualRequest)
    .flatMap((item) => item.items || [])
    .map(extractItemLabel)
    .filter(Boolean);
  const sourceCount = Math.max(visualSegments.length, itemLabels.length);
  const count = Math.min(3, sourceCount);
  if (count <= 1) return [];

  return Array.from({ length: count }, (_, index) => {
    const label = itemLabels[index] || shortSlotLabel(visualSegments[index]) || `Visual ${index + 1}`;
    const need = [
      label,
      textItems[index],
      visualSegments[index],
    ]
      .filter(Boolean)
      .join(" ");
    return {
      slotId: `derived${index + 1}`,
      label,
      need,
      keywords: tokenize(need).slice(0, 8),
      order: index + 1,
    };
  });
}

function splitVisualNeedSegments(value: string) {
  return value
    .replace(/^photos?\s+(depicting|showing)\s+/i, "")
    .replace(/^photo collage\s+(depicting|showing)\s+/i, "")
    .split(/\s*(?:,|、|;|；|・|\band\b)\s*/iu)
    .map((item) => item.replace(/^(and|or)\s+/i, "").trim())
    .filter((item) => item.length >= 3 && !/^(photo|photos|diagram|image|visual)$/i.test(item));
}

function extractItemLabel(value: string) {
  return value.split(/[：:]/)[0]?.trim().slice(0, 18) || "";
}

function shortSlotLabel(value: string | undefined) {
  if (!value) return "";
  return value
    .replace(/\b(photo|photos|depicting|showing|industrial|inside|with)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 18);
}
