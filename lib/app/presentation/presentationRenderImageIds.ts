import type { PresentationTaskSlideFrame } from "@/types/task";
import type {
  buildFramePresentationSpecFromTaskPlan,
} from "@/lib/app/presentation/presentationTaskPlanning";

export function collectFrameSpecPreferredImageIds(
  frameSpec?: ReturnType<typeof buildFramePresentationSpecFromTaskPlan> | null
) {
  const imageIds = new Set<string>();
  collectVisualRequestImageIds(frameSpec?.deckFrame?.openingSlide?.visualRequest, imageIds);
  collectVisualRequestImageIds(frameSpec?.deckFrame?.closingSlide?.visualRequest, imageIds);
  for (const slide of frameSpec?.slideFrames || []) {
    for (const block of slide.blocks || []) {
      collectVisualRequestImageIds(block.visualRequest, imageIds);
    }
  }
  return imageIds;
}

function collectVisualRequestImageIds(
  visual: PresentationTaskSlideFrame["blocks"][number]["visualRequest"] | undefined,
  imageIds: Set<string>
) {
  const imageId = visual?.preferredImageId?.trim();
  if (imageId) imageIds.add(imageId);
  for (const candidateImageId of visual?.candidateImageIds || []) {
    if (candidateImageId.trim()) imageIds.add(candidateImageId.trim());
  }
}
