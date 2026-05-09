import type { PresentationTaskPlan } from "@/types/task";
import {
  hasRenderablePresentationSlideFrames,
  sanitizeReadableSlideFrameTitle,
  sanitizeSlideFrameTitle,
} from "@/lib/app/presentation/presentationSlideFrames";
import {
  normalizePresentationVisualMainPolicy,
  syncDeckFrameSlideCount,
} from "@/lib/app/presentation/presentationPlanValidation";
import {
  applyBlockStylePreset,
  applyTitleLineFooterHeadingPolicy,
} from "@/lib/app/presentation/presentationTaskFrameBlockStyle";
import { expandMultiVisualCandidateFrame } from "@/lib/app/presentation/presentationTaskFrameVisualExpansion";

export function buildFramePresentationSpecFromTaskPlan(plan: PresentationTaskPlan) {
  if (!hasRenderablePresentationSlideFrames(plan.slideFrames)) {
    return null;
  }
  const slideFrames = normalizePresentationVisualMainPolicy(plan.slideFrames).map((frame) => {
    const expandedFrame = expandMultiVisualCandidateFrame(frame);
    const title = sanitizeReadableSlideFrameTitle(
      sanitizeSlideFrameTitle(expandedFrame.title)
    );
    const effectiveMasterFrameId =
      expandedFrame.masterFrameId ||
      plan.deckFrame?.masterFrameId ||
      "titleLineFooter";
    return {
      ...expandedFrame,
      title,
      blocks: expandedFrame.blocks.map((block) =>
        applyTitleLineFooterHeadingPolicy({
          block: applyBlockStylePreset(block),
          slideTitle: title,
          masterFrameId: effectiveMasterFrameId,
        })
      ),
    };
  });
  const deckFrame = syncDeckFrameSlideCount(plan.deckFrame, slideFrames);
  return {
    version: "0.1-frame" as const,
    title: plan.title || "Presentation",
    language: "ja" as const,
    theme: "business-clean" as const,
    density: "standard" as const,
    deckFrame,
    slideFrames,
  };
}
