import { describe, expect, it } from "vitest";
import { findPresentationPlanByDocumentId } from "@/lib/app/presentation/presentationPlanLibrary";
import { formatPresentationTaskPlanText } from "@/lib/app/presentation/presentationTaskPlanning";
import type { ReferenceLibraryItem } from "@/types/chat";
import type { PresentationTaskPlan } from "@/types/task";

function planWithResolvedImage(): PresentationTaskPlan {
  return {
    version: "0.1-presentation-task-plan",
    documentId: "ppt_payload_1",
    title: "Payload deck",
    sourceSummary: "Payload summary",
    extractedItems: [],
    strategyItems: [],
    keyMessages: [],
    slideItems: [],
    deckFrame: {
      slideCount: 1,
      masterFrameId: "titleLineFooter",
    },
    slideFrames: [
      {
        slideNumber: 1,
        title: "Resolved visual",
        layoutFrameId: "adaptiveTextMain",
        slideRole: "textMain",
        blocks: [
          {
            id: "text",
            kind: "list",
            styleId: "listCompact",
            items: ["Point"],
          },
          {
            id: "visual",
            kind: "visual",
            styleId: "visualContain",
            visualRequest: {
              type: "photo",
              brief: "Resolved image",
              preferredImageId: "img_selected",
              candidateImageIds: ["img_selected", "img_alt"],
              usagePolicy: "useOneOrMore",
              maxVisualItems: 2,
              selectionMatches: [
                {
                  slotId: "slot1",
                  label: "Selected",
                  need: "selected image",
                  status: "selected",
                  imageId: "img_selected",
                  score: 8,
                  threshold: 5,
                },
              ],
            },
          },
        ],
      },
    ],
    slides: [],
    missingInfo: [],
    nextSuggestions: [],
    latestPptx: null,
    updatedAt: "2026-05-06T00:00:00.000Z",
  };
}

describe("presentation plan library", () => {
  it("uses the saved structured payload when visible design text is only a projection", () => {
    const storedPlan = planWithResolvedImage();
    const item: ReferenceLibraryItem = {
      id: "doc:stored-1",
      sourceId: "stored-1",
      itemType: "kin_created",
      artifactType: "presentation_plan",
      title: "Payload deck",
      subtitle: "Document ID: ppt_payload_1",
      summary: "",
      excerptText: formatPresentationTaskPlanText(storedPlan),
      createdAt: "2026-05-06T00:00:00.000Z",
      updatedAt: "2026-05-06T00:00:00.000Z",
      structuredPayload: storedPlan,
    };

    const found = findPresentationPlanByDocumentId({
      documentId: "ppt_payload_1",
      referenceLibraryItems: [item],
    });

    expect(found?.plan.slideFrames[0]?.blocks[1]?.visualRequest).toMatchObject({
      preferredImageId: "img_selected",
      candidateImageIds: ["img_selected", "img_alt"],
    });
  });
});
