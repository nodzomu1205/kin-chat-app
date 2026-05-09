import type { PresentationTaskSlidePlan } from "@/types/task";

export function emptyStructuredSlideContent(): PresentationTaskSlidePlan["structuredContent"] {
  return {
    title: "",
    mainMessage: "",
    facts: [],
    visual: {
      brief: "",
      supportingFacts: [],
    },
    layout: {
      instruction: "",
      elements: [],
    },
  };
}

export function syncStructuredSlideContent(slide: PresentationTaskSlidePlan) {
  slide.structuredContent = {
    title: slide.title,
    mainMessage: slide.keyMessage,
    facts: [...slide.supportingInfo],
    visual: {
      brief: slide.keyVisual,
      supportingFacts: [...slide.visualSupportingInfo],
    },
    layout: {
      instruction: slide.placementComposition,
      elements: [...slide.layoutItems],
    },
  };
}
