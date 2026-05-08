import { describe, expect, it } from "vitest";
import {
  presentationVisualSlotMatchKey,
  resolvePresentationVisualSlots,
} from "@/lib/app/presentation/presentationVisualSelection";
import {
  baseVisualSelectionPlan as basePlan,
  normalizedTextsForVisualSelectionPlan as normalizedTextsForPlan,
} from "@/lib/app/presentation/presentationVisualSelectionTestHelpers";

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

});
