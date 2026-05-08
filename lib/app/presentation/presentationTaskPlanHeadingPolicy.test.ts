import { describe, expect, it } from "vitest";
import {
  buildFramePresentationSpecFromTaskPlan,
  buildPresentationTaskPlan,
} from "@/lib/app/presentation/presentationTaskPlanning";
import type { TaskResult } from "@/types/task";

const result: TaskResult = {
  taskId: "task",
  type: "PREP_TASK",
  status: "OK",
  summary: "Presentation design",
  keyPoints: [],
  detailBlocks: [],
  warnings: [],
  missingInfo: [],
  nextSuggestion: [],
};

describe("presentation task plan heading policy", () => {
  it("hides redundant adaptive visual-main annotation headings", () => {
    const plan = buildPresentationTaskPlan({
      title: "Ogikubo deck",
      result: {
        ...result,
        detailBlocks: [
          {
            title: "Slide Frame JSON",
            body: [
              JSON.stringify({
                deckFrame: {
                  masterFrameId: "titleLineFooter",
                  slideCount: 1,
                },
                slideFrames: [
                  {
                    slideNumber: 1,
                    title: "Ogikubo family area",
                    layoutFrameId: "adaptiveVisualMain",
                    slideRole: "visualMain",
                    blocks: [
                      {
                        id: "visual",
                        kind: "visual",
                        styleId: "visualContain",
                        visualRequest: {
                          type: "photo",
                          brief: "Ogikubo station",
                          prompt: "Ogikubo station and residential streets",
                        },
                      },
                      {
                        id: "annotation",
                        kind: "callout",
                        styleId: "callout",
                        heading: "Ogikubo family area",
                        text: "Station access and calm streets support family life.",
                      },
                    ],
                  },
                ],
              }),
            ],
          },
        ],
      },
      rawText: "",
    });

    const spec = buildFramePresentationSpecFromTaskPlan(plan);

    expect(spec?.slideFrames[0].blocks[1].text).toContain("Station access");
    expect(spec?.slideFrames[0].blocks[1].renderStyle?.showHeading).toBe(false);
  });
});
