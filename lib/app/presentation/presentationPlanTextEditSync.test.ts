import { describe, expect, it } from "vitest";
import { syncPresentationPlanStructuredPayloadFromEditedText } from "@/lib/app/presentation/presentationPlanTextEditSync";
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
});
