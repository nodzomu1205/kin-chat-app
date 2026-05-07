import { describe, expect, it } from "vitest";
import {
  presentationVisualSlotMatchKey,
  resolvePresentationVisualSlots,
  type PresentationVisualSlotNormalizedTextMap,
} from "@/lib/app/presentation/presentationVisualSelection";
import type { PresentationTaskPlan } from "@/types/task";

function basePlan(): PresentationTaskPlan {
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

function normalizedTextsForPlan(
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

describe("resolvePresentationVisualSlots", () => {
  it("uses stable ASCII keys for LLM-normalized slot text lookup", () => {
    expect(
      presentationVisualSlotMatchKey({
        slotId: "education",
        label: "文京区の教育施設",
        need: "文京区の教育環境や学校施設の様子",
        order: 1,
      })
    ).toMatch(/^slot_[a-z0-9]+$/);
  });

  it("matches Japanese school and exam visual needs against English image metadata", () => {
    const plan = basePlan();
    const visual = plan.slideFrames[0].blocks[1].visualRequest;
    if (visual) {
      visual.brief = "受験対策教材や学習指導のイメージ";
      visual.prompt = "受験対策の参考書や勉強する学生、講師から指導を受ける情景の写真";
      visual.visualSlots = [
        {
          slotId: "examPrep",
          label: "受験対策教材や学習指導のイメージ",
          need: "受験対策の参考書や勉強する学生、講師から指導を受ける情景の写真",
          order: 1,
        },
      ];
    }

    const resolved = resolvePresentationVisualSlots({
      normalizedSlotTexts: normalizedTextsForPlan(plan, {
        examPrep: "exam preparation study books student tutor learning",
      }),
      plan,
      imageCandidates: [
        {
          imageId: "img_exam",
          title: "Student studying with test books and tutor",
          presentationMeta: {
            version: "0.3-presentation-image-meta",
            visualBaseType: "photo",
            visibleSubjects: ["student", "textbook", "teacher", "studying"],
            embeddedTextItems: [],
            relationships: [],
            composition: "single_scene",
            semanticTags: ["exam", "test", "books", "learning"],
          },
        },
      ],
    });

    const resolvedVisual = resolved.slideFrames[0].blocks[1].visualRequest;
    expect(resolvedVisual?.preferredImageId).toBe("img_exam");
    expect(resolvedVisual?.selectionMatches?.[0]).toMatchObject({
      status: "selected",
      imageId: "img_exam",
    });
  });

  it("matches Japanese Tokyo area visual needs against English image metadata", () => {
    const plan = basePlan();
    const visual = plan.slideFrames[0].blocks[1].visualRequest;
    if (visual) {
      visual.visualSlots = [
        {
          slotId: "education",
          label: "文京区の教育施設",
          need: "文京区の教育環境や学校施設の様子",
          order: 1,
        },
        {
          slotId: "residential",
          label: "荻窪の住宅街",
          need: "荻窪駅周辺の住宅街や商店街の様子",
          order: 2,
        },
      ];
    }

    const resolved = resolvePresentationVisualSlots({
      normalizedSlotTexts: normalizedTextsForPlan(plan, {
        education: "Bunkyo ward education school campus facilities",
        residential: "Ogikubo station residential neighborhood shopping street",
      }),
      plan,
      imageCandidates: [
        {
          imageId: "img_ogikubo",
          title: "Ogikubo residential neighborhood near the station",
          presentationMeta: {
            version: "0.3-presentation-image-meta",
            visualBaseType: "photo",
            visibleSubjects: ["residential neighborhood", "shopping street", "station area"],
            embeddedTextItems: [],
            relationships: [],
            composition: "single_scene",
            semanticTags: ["ogikubo", "tokyo", "residential", "shopping"],
          },
        },
        {
          imageId: "img_bunkyo_school",
          title: "Bunkyo ward school campus and education facilities",
          presentationMeta: {
            version: "0.3-presentation-image-meta",
            visualBaseType: "photo",
            visibleSubjects: ["school campus", "education facilities", "classroom building"],
            embeddedTextItems: [],
            relationships: [],
            composition: "single_scene",
            semanticTags: ["bunkyo", "tokyo", "education", "school"],
          },
        },
      ],
    });

    const resolvedVisual = resolved.slideFrames[0].blocks[1].visualRequest;
    expect(resolvedVisual?.candidateImageIds).toEqual([
      "img_bunkyo_school",
      "img_ogikubo",
    ]);
    expect(resolvedVisual?.selectionMatches).toEqual([
      expect.objectContaining({
        label: "文京区の教育施設",
        status: "selected",
        imageId: "img_bunkyo_school",
      }),
      expect.objectContaining({
        label: "荻窪の住宅街",
        status: "selected",
        imageId: "img_ogikubo",
      }),
    ]);
  });

  it("uses named entity metadata to prefer an exact place or station match", () => {
    const plan = basePlan();
    const visual = plan.slideFrames[0].blocks[1].visualRequest;
    if (visual) {
      visual.visualSlots = [
        {
          slotId: "kichijoji",
          label: "吉祥寺駅周辺",
          need: "吉祥寺駅周辺の井の頭公園と商業エリアの写真",
          order: 1,
        },
      ];
    }

    const resolved = resolvePresentationVisualSlots({
      normalizedSlotTexts: normalizedTextsForPlan(plan, {
        kichijoji: "Kichijoji Station Inokashira Park shopping area Tokyo",
      }),
      plan,
      imageCandidates: [
        {
          imageId: "img_ogikubo",
          title: "Ogikubo Station building",
          presentationMeta: {
            version: "0.3-presentation-image-meta",
            visualBaseType: "photo",
            visibleSubjects: ["station building", "shopping street"],
            embeddedTextItems: [],
            relationships: [],
            composition: "single_scene",
            semanticTags: ["tokyo", "station", "shopping"],
            namedEntities: {
              places: ["Ogikubo"],
              stations: ["Ogikubo Station"],
              people: [],
              organizations: [],
              landmarks: [],
            },
          },
        },
        {
          imageId: "img_kichijoji",
          title: "Neighborhood street scene",
          presentationMeta: {
            version: "0.3-presentation-image-meta",
            visualBaseType: "photo",
            visibleSubjects: ["park entrance", "shopping area", "pedestrians"],
            embeddedTextItems: [],
            relationships: [],
            composition: "single_scene",
            semanticTags: ["tokyo", "park", "shopping"],
            namedEntities: {
              places: ["Kichijoji"],
              stations: ["Kichijoji Station"],
              people: [],
              organizations: [],
              landmarks: ["Inokashira Park"],
            },
          },
        },
      ],
    });

    const resolvedVisual = resolved.slideFrames[0].blocks[1].visualRequest;
    expect(resolvedVisual?.preferredImageId).toBe("img_kichijoji");
    expect(resolvedVisual?.candidateImageIds).toEqual(["img_kichijoji"]);
    expect(resolvedVisual?.selectionMatches).toEqual([
      expect.objectContaining({
        label: "吉祥寺駅周辺",
        status: "selected",
        imageId: "img_kichijoji",
      }),
    ]);
  });

  it("selects image IDs from ordered visual slots and ignores LLM-provided image IDs", () => {
    const plan = basePlan();
    const resolved = resolvePresentationVisualSlots({
      normalizedSlotTexts: normalizedTextsForPlan(plan),
      plan,
      imageCandidates: [
        {
          imageId: "img_store",
          title: "Retail store display",
          presentationMeta: {
            version: "0.3-presentation-image-meta",
            visualBaseType: "photo",
            visibleSubjects: ["retail store", "finished cotton clothing"],
            embeddedTextItems: [],
            relationships: [],
            composition: "single_scene",
            semanticTags: ["retail", "store"],
          },
        },
        {
          imageId: "img_field",
          title: "Cotton field and ginning",
          presentationMeta: {
            version: "0.3-presentation-image-meta",
            visualBaseType: "photo",
            visibleSubjects: ["cotton field", "ginning machine"],
            embeddedTextItems: [],
            relationships: [],
            composition: "single_scene",
            semanticTags: ["farming", "ginning"],
          },
        },
        {
          imageId: "img_dyeing",
          title: "Spinning and dyeing textile factory",
          presentationMeta: {
            version: "0.3-presentation-image-meta",
            visualBaseType: "photo",
            visibleSubjects: ["spinning machine", "dyeing textile factory"],
            embeddedTextItems: [],
            relationships: [],
            composition: "single_scene",
            semanticTags: ["spinning", "dyeing"],
          },
        },
      ],
    });

    const visual = resolved.slideFrames[0].blocks[1].visualRequest;
    expect(visual?.preferredImageId).toBe("img_field");
    expect(visual?.candidateImageIds).toEqual(["img_field", "img_dyeing", "img_store"]);
    expect(visual?.labels).toEqual(["Upstream", "Midstream", "Downstream"]);
    expect(visual?.selectionMatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Upstream",
          status: "selected",
          imageId: "img_field",
          threshold: 5,
        }),
      ])
    );
    expect(resolved.slideFrames[0].layoutIntent?.primaryImageId).toBe("img_field");
  });

  it("does not auto-match when LLM-normalized slot text is missing", () => {
    const plan = basePlan();
    const resolved = resolvePresentationVisualSlots({
      plan,
      imageCandidates: [
        {
          imageId: "img_field",
          title: "Cotton field and ginning",
          presentationMeta: {
            version: "0.3-presentation-image-meta",
            visualBaseType: "photo",
            visibleSubjects: ["cotton field", "ginning machine"],
            embeddedTextItems: [],
            relationships: [],
            composition: "single_scene",
            semanticTags: ["farming", "ginning"],
          },
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
