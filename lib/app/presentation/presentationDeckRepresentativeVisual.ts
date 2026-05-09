import type {
  PresentationTaskSlideFrame,
  PresentationTaskVisualRequest,
} from "@/types/task";

export function findRepresentativeVisual(
  frames: PresentationTaskSlideFrame[]
): PresentationTaskVisualRequest | undefined {
  const candidateFrames = frames.slice(0, Math.min(frames.length, 2));
  for (const frame of candidateFrames) {
    const visualBlock = frame.blocks.find((block) => {
      const visual = block.visualRequest;
      if (!visual) return false;
      return !!(
        visual.asset?.base64 ||
        visual.preferredImageId?.trim() ||
        visual.brief?.trim() ||
        visual.prompt?.trim()
      );
    });
    if (visualBlock?.visualRequest) return visualBlock.visualRequest;
  }
  return undefined;
}
