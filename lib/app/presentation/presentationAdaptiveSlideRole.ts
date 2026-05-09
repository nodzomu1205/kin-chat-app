import type {
  PresentationTaskSlideBlock,
  PresentationTaskSlideFrame,
} from "@/types/task";

export function inferAdaptiveSlideRole(
  frame: PresentationTaskSlideFrame
): PresentationTaskSlideFrame["slideRole"] {
  if (frame.layoutFrameId === "adaptiveVisualMain") return "visualMain";
  if (frame.layoutFrameId === "adaptiveTextMain") return "textMain";
  if (frame.layoutFrameId === "visualLeftTextRight") {
    const visualBlock = frame.blocks[0];
    if (!visualBlock?.visualRequest) return undefined;
    return isVisualMainCandidateBlock(visualBlock) ? "visualMain" : "textMain";
  }
  if (frame.layoutFrameId === "textLeftVisualRight") {
    return frame.blocks.some((block) => !!block.visualRequest) ? "textMain" : undefined;
  }
  if (frame.layoutFrameId === "leftRight50") {
    if (frame.blocks[0]?.visualRequest && !frame.blocks[1]?.visualRequest) {
      return isVisualMainCandidateBlock(frame.blocks[0]) ? "visualMain" : "textMain";
    }
    if (!frame.blocks[0]?.visualRequest && frame.blocks[1]?.visualRequest) {
      return "textMain";
    }
  }
  return undefined;
}

function isVisualMainCandidateBlock(block: PresentationTaskSlideBlock | undefined) {
  const visual = block?.visualRequest;
  if (!visual) return false;
  return (
    visual.type === "diagram" ||
    visual.type === "chart" ||
    visual.type === "table" ||
    visual.type === "map" ||
    visual.type === "iconSet"
  );
}
