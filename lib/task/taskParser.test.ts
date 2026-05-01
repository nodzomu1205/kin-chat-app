import { describe, expect, it } from "vitest";
import { parseTaskResult } from "@/lib/task/taskParser";

describe("taskParser", () => {
  it("parses presentation plan JSON with canonical slide frames", () => {
    const parsed = parseTaskResult(
      JSON.stringify({
        taskId: "task-frame",
        type: "PREP_TASK",
        status: "OK",
        summary: "Frame-based deck plan",
        extractedItems: ["Source fact"],
        strategyItems: ["audience: operators"],
        keyMessages: ["Show the workflow"],
        deckFrame: {
          slideCount: 1,
          masterFrameId: "titleLineFooter",
          pageNumber: { enabled: true, position: "bottomRight" },
        },
        slideFrames: [
          {
            slideNumber: 1,
            title: "Workflow",
            masterFrameId: "titleLineFooter",
            layoutFrameId: "visualLeftTextRight",
            speakerIntent: "Explain the workflow.",
            blocks: [
              {
                id: "block1",
                kind: "visual",
                styleId: "visualContain",
                visualRequest: {
                  type: "diagram",
                  brief: "Three-step workflow diagram",
                  prompt: "Draw intake, review, and output as connected steps.",
                },
              },
              {
                id: "block2",
                kind: "textStack",
                styleId: "textStackTopLeft",
                heading: "Workflow",
                text: "The process has three clear steps.",
                items: ["Intake", "Review", "Output"],
              },
            ],
          },
        ],
        warnings: [],
        missingInfo: [],
        nextSuggestion: [],
      })
    );

    expect(parsed?.detailBlocks).toEqual(
      expect.arrayContaining([
        {
          title: "Slide Frame JSON",
          body: [
            JSON.stringify({
              deckFrame: {
                slideCount: 1,
                masterFrameId: "titleLineFooter",
                pageNumber: { enabled: true, position: "bottomRight" },
              },
              slideFrames: [
                {
                  slideNumber: 1,
                  title: "Workflow",
                  masterFrameId: "titleLineFooter",
                  layoutFrameId: "visualLeftTextRight",
                  speakerIntent: "Explain the workflow.",
                  blocks: [
                    {
                      id: "block1",
                      kind: "visual",
                      styleId: "visualContain",
                      visualRequest: {
                        type: "diagram",
                        brief: "Three-step workflow diagram",
                        prompt: "Draw intake, review, and output as connected steps.",
                      },
                    },
                    {
                      id: "block2",
                      kind: "textStack",
                      styleId: "textStackTopLeft",
                      heading: "Workflow",
                      text: "The process has three clear steps.",
                      items: ["Intake", "Review", "Output"],
                    },
                  ],
                },
              ],
            }),
          ],
        },
      ])
    );
  });

  it("parses presentation plan JSON as a task result with slide design JSON", () => {
    const parsed = parseTaskResult(
      JSON.stringify({
        taskId: "task-1",
        type: "PREP_TASK",
        status: "OK",
        summary: "コットン生産工程の設計書",
        extractedItems: ["栽培・収穫から縫製までの工程がある"],
        strategyItems: ["audience: 産業関係者"],
        keyMessages: ["工程全体を理解する"],
        slideDesign: {
          slides: [
            {
              slideNumber: 1,
              placementComposition: "中央にタイトル",
              parts: [{ role: "タイトル", text: "コットンの生産工程" }],
            },
          ],
        },
        warnings: [],
        missingInfo: [],
        nextSuggestion: [],
      })
    );

    expect(parsed).toMatchObject({
      taskId: "task-1",
      type: "PREP_TASK",
      status: "OK",
      summary: "コットン生産工程の設計書",
      detailBlocks: [
        { title: "抽出事項", body: ["栽培・収穫から縫製までの工程がある"] },
        { title: "Presentation Strategy", body: ["audience: 産業関係者"] },
        { title: "キーメッセージ", body: ["工程全体を理解する"] },
        {
          title: "スライド設計JSON",
          body: [
            JSON.stringify({
              slides: [
                {
                  slideNumber: 1,
                  placementComposition: "中央にタイトル",
                  parts: [{ role: "タイトル", text: "コットンの生産工程" }],
                },
              ],
            }),
          ],
        },
      ],
    });
  });
});
