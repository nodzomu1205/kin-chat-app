import type { PresentationTaskSlideFrame } from "@/types/task";

export function isBodySlideSummaryReuse(
  title: string | undefined,
  frames: PresentationTaskSlideFrame[]
) {
  const normalizedTitle = title?.trim();
  if (!normalizedTitle) return false;
  return frames.some((frame) => {
    const textBlocks = frame.blocks.filter((block) => !block.visualRequest);
    return (
      frame.title.trim() === normalizedTitle ||
      textBlocks.some((block) => block.heading?.trim() === normalizedTitle)
    );
  });
}
