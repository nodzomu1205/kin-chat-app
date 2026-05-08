import { describe, expect, it } from "vitest";
import {
  buildPresentationTaskPlan,
  hasPresentationTaskPlanSlideFrames,
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

describe("presentation task plan shape", () => {
  it("distinguishes parsed presentation plans with slideFrames from empty fallback plans", () => {
    const emptyPlan = buildPresentationTaskPlan({
      title: "Empty",
      result: null,
      rawText: "not json",
    });
    const parsedPlan = buildPresentationTaskPlan({
      title: "Parsed",
      result: {
        ...result,
        detailBlocks: [
          {
            title: "Slide Frame JSON",
            body: [
              JSON.stringify({
                slideFrames: [
                  {
                    slideNumber: 1,
                    title: "Market",
                    layoutFrameId: "adaptiveTextMain",
                    slideRole: "textMain",
                    blocks: [
                      {
                        id: "block1",
                        kind: "list",
                        styleId: "listCompact",
                        items: ["A"],
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

    expect(hasPresentationTaskPlanSlideFrames(emptyPlan)).toBe(false);
    expect(hasPresentationTaskPlanSlideFrames(parsedPlan)).toBe(true);
  });

  it("keeps task-route generation debug on parsed presentation plans", () => {
    const plan = buildPresentationTaskPlan({
      title: "Debugged plan",
      result: {
        ...result,
        detailBlocks: [
          {
            title: "Slide Frame JSON",
            body: [
              JSON.stringify({
                slideFrames: [
                  {
                    slideNumber: 1,
                    title: "Slide 1",
                    layoutFrameId: "adaptiveTextMain",
                    blocks: [
                      {
                        id: "block1",
                        kind: "list",
                        styleId: "listCompact",
                        items: ["Point"],
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
      generationDebug: {
        correctionAttempted: true,
        correctionIssues: ["Slide 1 was repaired."],
      },
    });

    expect(plan.debug?.generation).toEqual({
      correctionAttempted: true,
      correctionIssues: ["Slide 1 was repaired."],
    });
  });
});
