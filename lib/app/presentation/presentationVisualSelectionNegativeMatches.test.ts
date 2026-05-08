import { describe, expect, it } from "vitest";
import { resolvePresentationVisualSlots } from "@/lib/app/presentation/presentationVisualSelection";
import {
  baseVisualSelectionPlan as basePlan,
  normalizedTextsForVisualSelectionPlan as normalizedTextsForPlan,
} from "@/lib/app/presentation/presentationVisualSelectionTestHelpers";

describe("resolvePresentationVisualSlots negative matches", () => {
  it("does not auto-match against image title or prompt when presentation metadata is missing", () => {
    const plan = basePlan();
    const resolved = resolvePresentationVisualSlots({
      normalizedSlotTexts: normalizedTextsForPlan(plan),
      plan,
      imageCandidates: [
        {
          imageId: "img_prompt_only",
          title: "Cotton field and ginning",
          prompt: "cotton farming ginning",
        },
      ],
    });

    const visual = resolved.slideFrames[0].blocks[1].visualRequest;
    expect(visual?.candidateImageIds).toBeUndefined();
    expect(visual?.selectionMatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: "unresolved", imageId: undefined }),
      ])
    );
  });

  it("leaves weak slots unresolved instead of substituting an unrelated image", () => {
    const plan = basePlan();
    const resolved = resolvePresentationVisualSlots({
      normalizedSlotTexts: normalizedTextsForPlan(plan),
      plan,
      imageCandidates: [
        {
          imageId: "img_spinning",
          title: "Spinning textile factory",
          presentationMeta: {
            version: "0.3-presentation-image-meta",
            visualBaseType: "photo",
            visibleSubjects: ["spinning machine", "textile factory"],
            embeddedTextItems: [],
            relationships: [],
            composition: "single_scene",
            semanticTags: ["spinning", "textile"],
          },
        },
      ],
    });

    const visual = resolved.slideFrames[0].blocks[1].visualRequest;
    expect(visual?.candidateImageIds).toEqual(["img_spinning"]);
    expect(visual?.labels).toEqual(["Midstream"]);
    expect(visual?.selectionMatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Upstream", status: "unresolved" }),
        expect.objectContaining({ label: "Midstream", status: "selected" }),
        expect.objectContaining({ label: "Downstream", status: "unresolved" }),
      ])
    );
  });

  it("does not use broad display labels as matching evidence", () => {
    const plan = basePlan();
    const visual = plan.slideFrames[0].blocks[1].visualRequest;
    if (visual) {
      visual.visualSlots = [
        {
          slotId: "midstream",
          label: "Midstream processing",
          need: "spinning weaving dyeing textile machinery",
          keywords: ["spinning", "weaving", "dyeing"],
          order: 1,
        },
      ];
    }

    const resolved = resolvePresentationVisualSlots({
      normalizedSlotTexts: normalizedTextsForPlan(plan),
      plan,
      imageCandidates: [
        {
          imageId: "img_store",
          title: "Organic cotton retail store",
          presentationMeta: {
            version: "0.3-presentation-image-meta",
            visualBaseType: "photo",
            visibleSubjects: ["clothing rack with organic cotton garments"],
            embeddedTextItems: [],
            relationships: [],
            composition: "single_scene",
            semanticTags: ["retail", "store", "organic cotton"],
          },
        },
      ],
    });

    const resolvedVisual = resolved.slideFrames[0].blocks[1].visualRequest;
    expect(resolvedVisual?.candidateImageIds).toBeUndefined();
    expect(resolvedVisual?.selectionMatches).toEqual([
      expect.objectContaining({
        label: "Midstream processing",
        status: "unresolved",
        imageId: undefined,
      }),
    ]);
  });

  it("does not select generic cotton product photos for risk-specific slots", () => {
    const plan = basePlan();
    const visual = plan.slideFrames[0].blocks[1].visualRequest;
    if (visual) {
      visual.visualSlots = [
        {
          slotId: "water-risk",
          label: "Water risk",
          need: "dry cotton farmland water shortage",
          keywords: ["dry farmland", "water shortage"],
          order: 1,
        },
        {
          slotId: "human-rights",
          label: "Human rights",
          need: "human rights issues child labor in cotton production",
          keywords: ["human rights", "child labor"],
          order: 2,
        },
      ];
    }

    const resolved = resolvePresentationVisualSlots({
      normalizedSlotTexts: normalizedTextsForPlan(plan),
      plan,
      imageCandidates: [
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
            semanticTags: ["organic cotton", "sustainable products", "retail"],
          },
        },
      ],
    });

    const resolvedVisual = resolved.slideFrames[0].blocks[1].visualRequest;
    expect(resolvedVisual?.candidateImageIds).toBeUndefined();
    expect(resolvedVisual?.selectionMatches).toEqual([
      expect.objectContaining({ label: "Water risk", status: "unresolved" }),
      expect.objectContaining({ label: "Human rights", status: "unresolved" }),
    ]);
  });
});
