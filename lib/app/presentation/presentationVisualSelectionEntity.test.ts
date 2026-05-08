import { describe, expect, it } from "vitest";
import { resolvePresentationVisualSlots } from "@/lib/app/presentation/presentationVisualSelection";
import {
  baseVisualSelectionPlan as basePlan,
  normalizedTextsForVisualSelectionPlan as normalizedTextsForPlan,
} from "@/lib/app/presentation/presentationVisualSelectionTestHelpers";

describe("resolvePresentationVisualSlots entity evidence", () => {
  it("requires explicit entity evidence before selecting an entity-specific image slot", () => {
    const plan = basePlan();
    const visual = plan.slideFrames[0].blocks[1].visualRequest;
    if (visual) {
      visual.visualSlots = [
        {
          slotId: "usa-field",
          label: "アメリカの綿花畑",
          need: "USA cotton field",
          keywords: ["United States cotton farming", "cotton field"],
          order: 1,
        },
      ];
    }

    const resolved = resolvePresentationVisualSlots({
      normalizedSlotTexts: normalizedTextsForPlan(plan),
      plan,
      imageCandidates: [
        {
          imageId: "img_generic_field",
          title: "Cotton field",
          presentationMeta: {
            version: "0.3-presentation-image-meta",
            visualBaseType: "photo",
            visibleSubjects: ["cotton plants", "cotton field"],
            embeddedTextItems: [],
            relationships: [],
            composition: "single_scene",
            semanticTags: ["cotton farming"],
          },
        },
        {
          imageId: "img_store",
          title: "Organic cotton garments",
          presentationMeta: {
            version: "0.3-presentation-image-meta",
            visualBaseType: "photo",
            visibleSubjects: ["clothing rack with organic cotton garments"],
            embeddedTextItems: [],
            relationships: [],
            composition: "single_scene",
            semanticTags: ["organic cotton", "retail"],
          },
        },
      ],
    });

    const resolvedVisual = resolved.slideFrames[0].blocks[1].visualRequest;
    expect(resolvedVisual?.candidateImageIds).toBeUndefined();
    expect(resolvedVisual?.selectionMatches).toEqual([
      expect.objectContaining({
        label: "アメリカの綿花畑",
        status: "unresolved",
        imageId: undefined,
      }),
    ]);
  });

  it("selects an entity-specific slot when the candidate metadata contains that entity", () => {
    const plan = basePlan();
    const visual = plan.slideFrames[0].blocks[1].visualRequest;
    if (visual) {
      visual.visualSlots = [
        {
          slotId: "usa-field",
          label: "アメリカの綿花畑",
          need: "USA cotton field",
          keywords: ["United States cotton farming", "cotton field"],
          order: 1,
        },
      ];
    }

    const resolved = resolvePresentationVisualSlots({
      normalizedSlotTexts: normalizedTextsForPlan(plan),
      plan,
      imageCandidates: [
        {
          imageId: "img_usa_field",
          title: "United States cotton field",
          description: "Cotton farming in the USA",
          presentationMeta: {
            version: "0.3-presentation-image-meta",
            visualBaseType: "photo",
            visibleSubjects: ["cotton plants", "cotton field"],
            embeddedTextItems: [],
            relationships: [],
            composition: "single_scene",
            semanticTags: ["USA", "United States", "cotton farming"],
          },
        },
      ],
    });

    const resolvedVisual = resolved.slideFrames[0].blocks[1].visualRequest;
    expect(resolvedVisual?.candidateImageIds).toEqual(["img_usa_field"]);
    expect(resolvedVisual?.selectionMatches).toEqual([
      expect.objectContaining({
        label: "アメリカの綿花畑",
        status: "selected",
        imageId: "img_usa_field",
      }),
    ]);
  });

  it("requires exact metadata evidence for acronym-based named systems", () => {
    const plan = basePlan();
    const visual = plan.slideFrames[0].blocks[1].visualRequest;
    if (visual) {
      visual.visualSlots = [
        {
          slotId: "certification",
          label: "GOTS認証ラベル",
          need: "GOTS certification label",
          keywords: ["certification label"],
          order: 1,
        },
      ];
    }

    const withoutGots = resolvePresentationVisualSlots({
      normalizedSlotTexts: normalizedTextsForPlan(plan),
      plan,
      imageCandidates: [
        {
          imageId: "img_label",
          title: "Certification label example",
          presentationMeta: {
            version: "0.3-presentation-image-meta",
            visualBaseType: "photo",
            visibleSubjects: ["certification label"],
            embeddedTextItems: [],
            relationships: [],
            composition: "single_scene",
            semanticTags: ["certification"],
          },
        },
      ],
    });
    expect(withoutGots.slideFrames[0].blocks[1].visualRequest?.candidateImageIds).toBeUndefined();

    const withGots = resolvePresentationVisualSlots({
      normalizedSlotTexts: normalizedTextsForPlan(plan),
      plan,
      imageCandidates: [
        {
          imageId: "img_gots",
          title: "GOTS certification label",
          presentationMeta: {
            version: "0.3-presentation-image-meta",
            visualBaseType: "photo",
            visibleSubjects: ["certification label"],
            embeddedTextItems: [{ text: "GOTS", role: "label" }],
            relationships: [],
            composition: "single_scene",
            semanticTags: ["GOTS", "certification"],
          },
        },
      ],
    });
    expect(withGots.slideFrames[0].blocks[1].visualRequest?.candidateImageIds).toEqual([
      "img_gots",
    ]);
  });
});
