import { describe, expect, it } from "vitest";
import { syncPresentationPlanStructuredPayloadFromEditedText } from "@/lib/app/presentation/presentationPlanTextEditSync";
import {
  buildFramePresentationSpecFromTaskPlan,
  formatPresentationTaskPlanText,
} from "@/lib/app/presentation/presentationTaskPlanning";
import type { PresentationTaskPlan } from "@/types/task";

function createPlan(): PresentationTaskPlan {
  return {
    version: "0.1-presentation-task-plan",
    documentId: "ppt_edit_sync",
    title: "Original deck",
    sourceSummary: "",
    extractedItems: [],
    strategyItems: [],
    keyMessages: [],
    slideItems: [],
    deckFrame: {
      slideCount: 1,
      masterFrameId: "titleLineFooter",
      openingSlide: {
        enabled: true,
        frameId: "visualTitleCover",
        title: "Original cover",
        visualRequest: {
          type: "photo",
          brief: "Original cover label",
          prompt: "Original cover prompt",
          visualSlots: [
            {
              slotId: "cover",
              label: "Original cover label",
              need: "Original cover need",
              order: 1,
            },
          ],
          selectionMatches: [
            {
              slotId: "cover",
              label: "Original cover label",
              need: "Original cover need",
              status: "selected",
              imageId: "img_cover",
              score: 1,
              threshold: 0.2,
            },
          ],
          preferredImageId: "img_cover",
        },
      },
    },
    slideFrames: [
      {
        slideNumber: 1,
        title: "Original slide",
        masterFrameId: "titleLineFooter",
        layoutFrameId: "adaptiveVisualMain",
        slideRole: "visualMain",
        blocks: [
          {
            id: "visual1",
            kind: "visual",
            styleId: "visualContain",
            visualRequest: {
              type: "photo",
              brief: "Original visual",
              visualSlots: [
                {
                  slotId: "main",
                  label: "Original label",
                  need: "Original need",
                  order: 1,
                },
                {
                  slotId: "extra",
                  label: "Extra label",
                  need: "Extra need",
                  order: 2,
                },
              ],
              selectionMatches: [
                {
                  slotId: "main",
                  label: "Original label",
                  need: "Original need",
                  status: "selected",
                  imageId: "img_main",
                  score: 1,
                  threshold: 0.2,
                },
                {
                  slotId: "extra",
                  label: "Extra label",
                  need: "Extra need",
                  status: "selected",
                  imageId: "img_extra",
                  score: 1,
                  threshold: 0.2,
                },
              ],
              preferredImageId: "img_main",
            },
          },
          {
            id: "annotation",
            kind: "textStack",
            styleId: "textStackTopLeft",
            heading: "Remove me",
            text: "Original body",
          },
          {
            id: "points",
            kind: "list",
            styleId: "listCompact",
            heading: "Original heading",
            text: "Original lead",
            items: ["Original item A", "Original item B"],
          },
        ],
      },
    ],
    slides: [],
    missingInfo: [],
    nextSuggestions: [],
    latestPptx: null,
    updatedAt: "2026-05-09T00:00:00.000Z",
  };
}

describe("presentationPlanTextEditSync", () => {
  it("syncs edited visible slide text back into slideFrames", () => {
    const editedText = [
      "【PPT設計書】",
      "Document ID: ppt_edit_sync",
      "",
      "■ スライド設計",
      "- Slide 1: Edited slide",
      "- Frame: adaptiveVisualMain",
      "- Role: visualMain",
      "- visual1 visual (visualContain)",
      "-   - Visual slot 1:",
      "-     - ビジュアルプロンプト: Edited need",
      "-     - ビジュアル内表示ラベル: Edited label",
      "- annotation textStack (textStackTopLeft)",
      "-   - 表示本文: Edited body",
    ].join("\n");

    const synced = syncPresentationPlanStructuredPayloadFromEditedText({
      plan: createPlan(),
      title: "Edited deck",
      text: editedText,
      updatedAt: "2026-05-09T01:00:00.000Z",
    });

    expect(synced.title).toBe("Edited deck");
    expect(synced.slideFrames[0].title).toBe("Edited slide");
    expect(synced.slideFrames[0].blocks).toHaveLength(2);
    expect(synced.slideFrames[0].blocks[1]).toMatchObject({
      id: "annotation",
      text: "Edited body",
    });
    expect(synced.slideFrames[0].blocks[1].heading).toBeUndefined();
    const visual = synced.slideFrames[0].blocks[0].visualRequest;
    expect(visual?.visualSlots).toEqual([
      {
        slotId: "main",
        label: "Edited label",
        need: "Edited need",
        order: 1,
      },
    ]);
    expect(visual?.selectionMatches).toEqual([
      expect.objectContaining({
        slotId: "main",
        label: "Edited label",
        need: "Edited need",
        imageId: "img_main",
      }),
    ]);
  });

  it("syncs edited visible items back into slideFrames", () => {
    const editedText = [
      "- Slide 1: Edited slide",
      "- visual1 visual (visualContain)",
      "-   - Visual slot 1:",
      "-     - Visual prompt: Original need",
      "-     - Visual label: Original label",
      "- points list (listCompact)",
      "-   - Heading: Edited heading",
      "-   - Body: Edited lead",
      "-   - Items:",
      "-     - Edited item A",
      "-     - Edited item B",
    ].join("\n");

    const synced = syncPresentationPlanStructuredPayloadFromEditedText({
      plan: createPlan(),
      text: editedText,
    });

    expect(synced.slideFrames[0].blocks[1]).toMatchObject({
      id: "points",
      heading: "Edited heading",
      text: "Edited lead",
      items: ["Edited item A", "Edited item B"],
    });
  });

  it("removes visible items from slideFrames when the item section is deleted", () => {
    const editedText = [
      "- Slide 1: Edited slide",
      "- visual1 visual (visualContain)",
      "-   - Visual slot 1:",
      "-     - Visual prompt: Original need",
      "-     - Visual label: Original label",
      "- points list (listCompact)",
      "-   - Heading: Edited heading",
      "-   - Body: Edited lead",
    ].join("\n");

    const synced = syncPresentationPlanStructuredPayloadFromEditedText({
      plan: createPlan(),
      text: editedText,
    });

    expect(synced.slideFrames[0].blocks[1]).toMatchObject({
      id: "points",
      heading: "Edited heading",
      text: "Edited lead",
    });
    expect(synced.slideFrames[0].blocks[1].items).toBeUndefined();
  });

  it("syncs edited opening slide title and visual slot text", () => {
    const editedText = [
      "- Opening slide: visualTitleCover / Edited cover",
      "- openingVisual visual (visualCover)",
      "-   - Visual slot 1:",
      "-     - Visual prompt: Edited cover need",
      "-     - Visual label: Edited cover label",
    ].join("\n");

    const synced = syncPresentationPlanStructuredPayloadFromEditedText({
      plan: createPlan(),
      text: editedText,
    });

    const opening = synced.deckFrame?.openingSlide;
    expect(opening?.title).toBe("Edited cover");
    expect(opening?.visualRequest?.visualSlots?.[0]).toMatchObject({
      slotId: "cover",
      label: "Edited cover label",
      need: "Edited cover need",
    });
    expect(opening?.visualRequest?.selectionMatches?.[0]).toMatchObject({
      slotId: "cover",
      label: "Edited cover label",
      need: "Edited cover need",
      imageId: "img_cover",
    });
  });

  it("hides a deleted visual slot label while preserving the selected visual", () => {
    const editedText = [
      "- Slide 1: Edited slide",
      "- visual1 visual (visualContain)",
      "-   - Visual slot 1:",
      "-     - Visual prompt: Edited need",
    ].join("\n");

    const synced = syncPresentationPlanStructuredPayloadFromEditedText({
      plan: createPlan(),
      text: editedText,
    });
    const visual = synced.slideFrames[0].blocks[0].visualRequest;
    expect(visual?.visualSlots?.[0]).toMatchObject({
      slotId: "main",
      label: "Original label",
      need: "Edited need",
    });
    expect(visual?.preferredImageId).toBe("img_main");
    expect(visual?.selectionMatches?.[0]).toMatchObject({
      slotId: "main",
      label: "Original label",
      need: "Edited need",
      imageId: "img_main",
    });
    expect(visual?.renderStyle?.hiddenLabelSlotIds).toEqual(["main"]);

    const frameSpec = buildFramePresentationSpecFromTaskPlan(synced);
    expect(frameSpec?.slideFrames[0].blocks[0].visualRequest).toMatchObject({
      preferredImageId: "img_main",
      renderStyle: expect.objectContaining({ showBrief: false }),
    });
    const visibleText = formatPresentationTaskPlanText(synced);
    expect(visibleText).toContain("Visual slot 1:");
    expect(visibleText).toContain("Edited need");
    expect(visibleText).toContain("img_main");
    expect(visibleText).not.toContain("Original label");
  });

  it("syncs a direct visual prompt edit when no visual slots are present", () => {
    const plan = createPlan();
    const visual = plan.slideFrames[0].blocks[0].visualRequest;
    if (visual) {
      visual.visualSlots = undefined;
      visual.selectionMatches = undefined;
      visual.prompt = "Original direct prompt";
      visual.labels = ["Original direct label"];
    }
    const editedText = [
      "- Slide 1: Edited slide",
      "- visual1 visual (visualContain)",
      "-   - Visual prompt: Edited direct prompt",
      "-   - Visual label: Edited direct label",
    ].join("\n");

    const synced = syncPresentationPlanStructuredPayloadFromEditedText({
      plan,
      text: editedText,
    });

    expect(synced.slideFrames[0].blocks[0].visualRequest).toMatchObject({
      prompt: "Edited direct prompt",
      brief: "Edited direct label",
      labels: ["Edited direct label"],
    });
  });
});
