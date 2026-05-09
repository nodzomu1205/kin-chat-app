import type { PresentationTaskSlideBlock } from "@/types/task";

export function normalizeBlockIds(blocks: PresentationTaskSlideBlock[]) {
  return blocks.map((block, index) => ({
    ...block,
    id: block.id || `block${index + 1}`,
  }));
}

export function normalizeBlockDisplayFields(
  block: PresentationTaskSlideBlock
): PresentationTaskSlideBlock {
  if (block.styleId === "listCompact") {
    return {
      ...block,
      kind: block.kind === "visual" ? block.kind : "list",
      text: undefined,
    };
  }
  if (block.styleId === "headlineCenter" && block.heading && block.text) {
    return {
      ...block,
      heading: undefined,
    };
  }
  if (block.styleId === "visualContain" || block.styleId === "visualCover") {
    return {
      ...block,
      heading: undefined,
      text: undefined,
      items: undefined,
    };
  }
  return block;
}
