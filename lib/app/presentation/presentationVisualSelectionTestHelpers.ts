import {
  presentationVisualSlotMatchKey,
  type PresentationVisualSlotNormalizedTextMap,
} from "@/lib/app/presentation/presentationVisualSelection";
import type { PresentationTaskPlan } from "@/types/task";

export function baseVisualSelectionPlan(): PresentationTaskPlan {
  return {
    version: "0.1-presentation-task-plan",
    documentId: "ppt_test",
    title: "Cotton",
    sourceSummary: "",
    extractedItems: [],
    strategyItems: [],
    keyMessages: [],
    slideItems: [],
    slideFrames: [
      {
        slideNumber: 1,
        title: "Supply chain structure",
        masterFrameId: "titleLineFooter",
        layoutFrameId: "adaptiveTextMain",
        slideRole: "textMain",
        blocks: [
          {
            id: "block1",
            kind: "list",
            styleId: "listCompact",
            items: ["Upstream", "Midstream", "Downstream"],
          },
          {
            id: "block2",
            kind: "visual",
            styleId: "visualContain",
            visualRequest: {
              type: "photo",
              brief: "Supply chain support visuals",
              visualSlots: [
                {
                  slotId: "upstream",
                  label: "Upstream",
                  need: "cotton farming ginning",
                  keywords: ["cotton field", "ginning"],
                  order: 1,
                },
                {
                  slotId: "midstream",
                  label: "Midstream",
                  need: "spinning dyeing textile factory",
                  keywords: ["spinning", "dyeing"],
                  order: 2,
                },
                {
                  slotId: "downstream",
                  label: "Downstream",
                  need: "sewing retail store finished cotton clothing",
                  keywords: ["retail store", "sewing"],
                  order: 3,
                },
              ],
              preferredImageId: "img_wrong",
              candidateImageIds: ["img_wrong"],
              labels: ["Wrong"],
            },
          },
        ],
        layoutIntent: {
          primaryImageId: "img_wrong",
          visualPlacement: "rightGrid",
        },
      },
    ],
    slides: [],
    missingInfo: [],
    nextSuggestions: [],
    latestPptx: null,
    updatedAt: "2026-05-05T00:00:00.000Z",
  };
}

export function normalizedTextsForVisualSelectionPlan(
  plan: PresentationTaskPlan,
  overrides: Record<string, string> = {}
): PresentationVisualSlotNormalizedTextMap {
  const entries: PresentationVisualSlotNormalizedTextMap = {};
  for (const frame of plan.slideFrames) {
    for (const block of frame.blocks) {
      for (const slot of block.visualRequest?.visualSlots || []) {
        entries[presentationVisualSlotMatchKey(slot)] =
          overrides[slot.slotId] ||
          [slot.label, slot.need, ...(slot.keywords || [])].join(" ");
      }
    }
  }
  for (const slot of plan.deckFrame?.openingSlide?.visualRequest?.visualSlots || []) {
    entries[presentationVisualSlotMatchKey(slot)] =
      overrides[slot.slotId] ||
      [slot.label, slot.need, ...(slot.keywords || [])].join(" ");
  }
  return entries;
}
