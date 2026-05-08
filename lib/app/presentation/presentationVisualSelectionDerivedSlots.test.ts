import { describe, expect, it } from "vitest";
import { resolvePresentationVisualSlots } from "@/lib/app/presentation/presentationVisualSelection";
import {
  baseVisualSelectionPlan as basePlan,
  normalizedTextsForVisualSelectionPlan as normalizedTextsForPlan,
} from "@/lib/app/presentation/presentationVisualSelectionTestHelpers";

describe("resolvePresentationVisualSlots derived slots", () => {
  it("derives ordered visual slots from slide text and visual prompt when slots are missing", () => {
    const plan = basePlan();
    const visual = plan.slideFrames[0].blocks[1].visualRequest;
    if (visual) {
      visual.visualSlots = [
        {
          slotId: "cultivation",
          label: "Cultivation",
          need: "cotton plants in the field",
          order: 1,
        },
        {
          slotId: "ginning",
          label: "Ginning",
          need: "roller gin machines",
          order: 2,
        },
        {
          slotId: "spinning",
          label: "Spinning",
          need: "industrial spinning machines",
          order: 3,
        },
      ];
      visual.brief = "Cultivation, ginning, and spinning photos";
      visual.prompt =
        "Photo collage showing cotton plants in the field, roller gin machines, and industrial spinning machines";
    }
    plan.slideFrames[0].blocks[0].items = [
      "Cultivation: cotton plants in the field",
      "Ginning: roller gin machines",
      "Spinning: industrial spinning machines",
    ];

    const resolved = resolvePresentationVisualSlots({
      normalizedSlotTexts: normalizedTextsForPlan(plan),
      plan,
      imageCandidates: [
        {
          imageId: "img_spinning",
          title: "Industrial spinning machines",
          presentationMeta: {
            version: "0.3-presentation-image-meta",
            visualBaseType: "photo",
            visibleSubjects: ["industrial spinning machines"],
            embeddedTextItems: [],
            relationships: [],
            composition: "single_scene",
            semanticTags: ["spinning"],
          },
        },
        {
          imageId: "img_ginning",
          title: "Roller gin machines",
          presentationMeta: {
            version: "0.3-presentation-image-meta",
            visualBaseType: "photo",
            visibleSubjects: ["roller gin machines"],
            embeddedTextItems: [],
            relationships: [],
            composition: "single_scene",
            semanticTags: ["ginning"],
          },
        },
        {
          imageId: "img_field",
          title: "Cotton plants in the field",
          presentationMeta: {
            version: "0.3-presentation-image-meta",
            visualBaseType: "photo",
            visibleSubjects: ["cotton plants", "field"],
            embeddedTextItems: [],
            relationships: [],
            composition: "single_scene",
            semanticTags: ["cultivation"],
          },
        },
      ],
    });

    const resolvedVisual = resolved.slideFrames[0].blocks[1].visualRequest;
    expect(resolvedVisual?.candidateImageIds).toEqual([
      "img_field",
      "img_ginning",
      "img_spinning",
    ]);
    expect(resolvedVisual?.labels).toEqual(["Cultivation", "Ginning", "Spinning"]);
  });

  it("resolves visualTitleCover opening slide visuals from the image library", () => {
    const plan = basePlan();
    plan.deckFrame = {
      slideCount: 1,
      masterFrameId: "titleLineFooter",
      openingSlide: {
        enabled: true,
        frameId: "visualTitleCover",
        title: "Cotton supply chain",
        visualRequest: {
          type: "photo",
          brief: "Cotton field cover image",
          prompt: "Wide cover photo of cotton plants in a field",
          visualSlots: [
            {
              slotId: "cover",
              label: "Cover",
              need: "cotton plants field cover",
              order: 1,
            },
          ],
        },
      },
    };

    const resolved = resolvePresentationVisualSlots({
      normalizedSlotTexts: normalizedTextsForPlan(plan),
      plan,
      imageCandidates: [
        {
          imageId: "img_cover",
          title: "Cotton plants in the field",
          presentationMeta: {
            version: "0.3-presentation-image-meta",
            visualBaseType: "photo",
            visibleSubjects: ["cotton plants", "field"],
            embeddedTextItems: [],
            relationships: [],
            composition: "single_scene",
            semanticTags: ["cotton", "field", "cover"],
          },
        },
      ],
    });

    expect(resolved.deckFrame?.openingSlide?.visualRequest).toMatchObject({
      preferredImageId: "img_cover",
      candidateImageIds: ["img_cover"],
      labels: ["Cover"],
      selectionMatches: [
        expect.objectContaining({
          status: "selected",
          imageId: "img_cover",
        }),
      ],
    });
  });
});
