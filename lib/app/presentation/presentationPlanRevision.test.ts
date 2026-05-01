import { describe, expect, it } from "vitest";
import { applyPresentationPlanInstruction } from "@/lib/app/presentation/presentationPlanRevision";
import type { PresentationTaskPlan } from "@/types/task";

function basePlan(): PresentationTaskPlan {
  return {
    version: "0.1-presentation-task-plan",
    title: "Cotton deck",
    sourceSummary: "",
    extractedItems: [],
    strategyItems: [],
    keyMessages: [],
    slideItems: [],
    deckFrame: { slideCount: 2, masterFrameId: "titleLineFooter" },
    slideFrames: [
      {
        slideNumber: 1,
        title: "Overview",
        masterFrameId: "titleLineFooter",
        layoutFrameId: "titleBody",
        blocks: [
          {
            id: "block1",
            kind: "list",
            styleId: "listCompact",
            items: ["Item one"],
          },
        ],
      },
      {
        slideNumber: 2,
        title: "Flow",
        masterFrameId: "titleLineFooter",
        layoutFrameId: "visualLeftTextRight",
        blocks: [
          {
            id: "block1",
            kind: "visual",
            styleId: "visualContain",
            visualRequest: {
              type: "diagram",
              brief: "コットン生産工程を示すフロー図。",
              prompt: "栽培・収穫→ジニング→紡績",
            },
          },
          {
            id: "block2",
            kind: "list",
            styleId: "listCompact",
            items: ["栽培・収穫", "ジニング", "紡績"],
          },
        ],
      },
    ],
    slides: [],
    missingInfo: [],
    nextSuggestions: [],
    updatedAt: "2026-04-30T00:00:00.000Z",
  };
}

describe("presentationPlanRevision", () => {
  it("applies deck-wide font scaling instructions", () => {
    const result = applyPresentationPlanInstruction(
      basePlan(),
      "全てのスライドの表示本文と表示項目の文字サイズをもっと大きくして！"
    );

    expect(result.changed).toBe(true);
    expect(result.plan.deckFrame?.typography).toMatchObject({
      bodyScale: 1.18,
      itemScale: 1.18,
    });
  });

  it("removes a visual brief and makes a flow vertical for a slide instruction", () => {
    const result = applyPresentationPlanInstruction(
      basePlan(),
      "スライド２の「コットン生産工程を示すフロー図。」は不要なので削除。フロー図を垂直方向にして欲しい。"
    );

    const visual = result.plan.slideFrames[1].blocks[0].visualRequest;
    expect(result.changed).toBe(true);
    expect(visual?.brief).toBe("");
    expect(visual?.renderStyle).toMatchObject({
      showBrief: false,
      orientation: "vertical",
    });
  });

  it("applies slide-specific body font scaling after image generation", () => {
    const plan = basePlan();
    plan.slideFrames[0].blocks[0].visualRequest = {
      type: "illustration",
      brief: "Generated visual",
      prompt: "Cotton plant",
      asset: {
        imageId: "img_test",
        mimeType: "image/png",
        base64: "abc",
      },
    };
    const result = applyPresentationPlanInstruction(
      plan,
      "スライド１の表示本文の文字を大幅に大きくして！"
    );

    expect(result.changed).toBe(true);
    expect(result.plan.slideFrames[0].blocks[0].renderStyle).toMatchObject({
      fontSize: "xlarge",
      itemFontSize: "xlarge",
    });
    expect(result.plan.slideFrames[0].blocks[0].visualRequest?.asset?.imageId).toBe("img_test");
  });
});
