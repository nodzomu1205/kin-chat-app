import type { PresentationTaskSlideFrame } from "@/types/task";
import { normalizeFrameTitle } from "@/lib/app/presentation/presentationFrameTitleNormalization";
import { normalizeDenseHeroDetailsFrames } from "@/lib/app/presentation/presentationDenseFrameNormalization";

export function finalizeFrameNormalization(
  frames: PresentationTaskSlideFrame[]
): PresentationTaskSlideFrame[] {
  return normalizeDenseHeroDetailsFrames(frames).map((frame, index) => ({
    ...frame,
    slideNumber: index + 1,
    title: normalizeFrameTitle(frame.title),
  }));
}
