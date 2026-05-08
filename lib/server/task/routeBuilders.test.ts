import { describe, expect, it } from "vitest";
import {
  buildTaskCompletionResponsesRequest,
  buildTaskResponsesRequest,
  buildTaskRouteResponse,
  completePresentationPlanSlideFrames,
  validatePresentationPlanCompleteness,
  TASK_ROUTE_MODEL,
} from "@/lib/server/task/routeBuilders";
import type { TaskRequest } from "@/types/task";

const sampleTask: TaskRequest = {
  type: "FORMAT_TASK",
  taskId: "TASK-1",
  dataKind: "document_package",
  goal: "Summarize the document",
  inputRef: "DOC-1",
  inputSummary: "A short source summary",
  constraints: ["Use headings", "Stay concise"],
  outputFormat: "markdown",
  priority: "MID",
  visibility: "USER_VISIBLE",
  responseMode: "STRUCTURED_RESULT",
  existingTitle: "Existing title",
};

describe("task route builders", () => {
  it("builds the OpenAI responses request from a task", () => {
    const request = buildTaskResponsesRequest(sampleTask);

    expect(request.model).toBe(TASK_ROUTE_MODEL);
    expect(request.input).toContain("TASK_ID: TASK-1");
    expect(request.input).toContain("EXISTING_TITLE: Existing title");
    expect(request.input).toContain("Do not create a new title.");
    expect(request).not.toHaveProperty("text");
  });

  it("uses structured JSON output for presentation plans without fixing slide count", () => {
    const request = buildTaskResponsesRequest({
      ...sampleTask,
      type: "PREP_TASK",
      outputFormat: "presentation_plan",
    });

    expect(request.input).toContain("<<SYS_PRESENTATION_PLAN_TASK>>");
    expect(request.input).toContain(
      "If the source naturally implies 5-7 slides, create 5-7 slideFrames."
    );
    expect(request.text?.format).toMatchObject({
      type: "json_schema",
      name: "presentation_plan",
    });
    const slideFrames = (
      request.text?.format as { schema?: { properties?: Record<string, unknown> } }
    ).schema?.properties?.slideFrames;
    expect(slideFrames).toMatchObject({ minItems: 1 });
    expect(slideFrames).not.toHaveProperty("maxItems");
  });

  it("nudges presentation block schema toward usable text or visual payloads", () => {
    const request = buildTaskResponsesRequest({
      ...sampleTask,
      type: "PREP_TASK",
      outputFormat: "presentation_plan",
    });
    const schema = (request.text?.format as { schema?: { properties?: Record<string, unknown> } })
      .schema;
    const blockSchema = (
      schema?.properties?.slideFrames as {
        items?: {
          properties?: {
            blocks?: {
              items?: {
                anyOf?: Array<{ required: string[] }>;
                properties?: Record<string, unknown>;
              };
            };
          };
        };
      }
    ).items?.properties?.blocks?.items;
    const visualRequestSchema = blockSchema?.properties?.visualRequest as {
      anyOf?: Array<{ required: string[] }>;
      properties?: Record<string, unknown>;
    };

    expect(blockSchema?.anyOf).toEqual([
      { type: "object", required: ["text"] },
      { type: "object", required: ["items"] },
      { type: "object", required: ["visualRequest"] },
    ]);
    expect(visualRequestSchema.anyOf).toEqual([
      { type: "object", required: ["brief"] },
      { type: "object", required: ["prompt"] },
      { type: "object", required: ["promptNote"] },
      { type: "object", required: ["visualSlots"] },
    ]);
    expect(visualRequestSchema.properties?.brief).toMatchObject({ type: "string" });
  });

  it("builds the task route response payload", () => {
    expect(
      buildTaskRouteResponse({
        raw: "<<SYS_TASK_RESULT>>",
        parsed: null,
        usage: {
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30,
        },
      })
    ).toEqual({
      raw: "<<SYS_TASK_RESULT>>",
      parsed: null,
      usage: {
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
      },
    });
  });

  it("flags presentation plans that declare more body slides than slideFrames contain", () => {
    expect(
      validatePresentationPlanCompleteness({
        task: {
          ...sampleTask,
          type: "PREP_TASK",
          outputFormat: "presentation_plan",
        },
        parsed: {
          taskId: "task",
          type: "PREP_TASK",
          status: "OK",
          summary: "",
          keyPoints: [],
          detailBlocks: [
            {
              title: "Slide Frame JSON",
              body: [
                JSON.stringify({
                  deckFrame: { slideCount: 1 },
                  slideFrames: [{ slideNumber: 1 }],
                }),
              ],
            },
            {
              title: "キーメッセージ",
              body: ["One", "Two", "Three", "Four", "Five"],
            },
          ],
          warnings: [],
          missingInfo: [],
          nextSuggestion: [],
        },
      })?.message
    ).toContain("incomplete");
  });

  it("flags text-main presentation slides that only contain visual blocks", () => {
    const result = validatePresentationPlanCompleteness({
      task: {
        ...sampleTask,
        type: "PREP_TASK",
        outputFormat: "presentation_plan",
      },
      parsed: {
        taskId: "task",
        type: "PREP_TASK",
        status: "OK",
        summary: "",
        keyPoints: [],
        detailBlocks: [
          {
            title: "Slide Frame JSON",
            body: [
              JSON.stringify({
                deckFrame: { slideCount: 1 },
                slideFrames: [
                  {
                    slideNumber: 1,
                    title: "Market overview",
                    slideRole: "textMain",
                    layoutFrameId: "adaptiveTextMain",
                    blocks: [
                      {
                        id: "block1",
                        kind: "visual",
                        styleId: "visualContain",
                        visualRequest: { brief: "Market chart" },
                      },
                    ],
                  },
                ],
              }),
            ],
          },
        ],
        warnings: [],
        missingInfo: [],
        nextSuggestion: [],
      },
    });

    expect(result?.message).toContain("no usable text/list/callout block");
  });

  it("flags visual-main presentation slides that only contain text blocks", () => {
    const result = validatePresentationPlanCompleteness({
      task: {
        ...sampleTask,
        type: "PREP_TASK",
        outputFormat: "presentation_plan",
      },
      parsed: {
        taskId: "task",
        type: "PREP_TASK",
        status: "OK",
        summary: "",
        keyPoints: [],
        detailBlocks: [
          {
            title: "Slide Frame JSON",
            body: [
              JSON.stringify({
                deckFrame: { slideCount: 1 },
                slideFrames: [
                  {
                    slideNumber: 1,
                    title: "Hero concept",
                    slideRole: "visualMain",
                    layoutFrameId: "adaptiveVisualMain",
                    blocks: [
                      {
                        id: "block1",
                        kind: "callout",
                        styleId: "callout",
                        text: "A short annotation",
                      },
                    ],
                  },
                ],
              }),
            ],
          },
        ],
        warnings: [],
        missingInfo: [],
        nextSuggestion: [],
      },
    });

    expect(result?.message).toContain("no usable visualRequest");
  });

  it("passes block-level presentation issues to the correction prompt", () => {
    const request = buildTaskCompletionResponsesRequest({
      task: {
        ...sampleTask,
        type: "PREP_TASK",
        outputFormat: "presentation_plan",
      },
      previousRaw: "{}",
      expectedBodySlideCount: 1,
      actualBodySlideCount: 1,
      issues: ["Slide 1 is adaptiveTextMain but has no usable text/list/callout block."],
    });

    expect(request.input).toContain("Detected issues:");
    expect(request.input).toContain(
      "Slide 1 is adaptiveTextMain but has no usable text/list/callout block."
    );
    expect(request.input).toContain("every slideFrame has usable blocks");
  });

  it("fills missing presentation slideFrames from keyMessages", () => {
    const raw = JSON.stringify({
      taskId: "TASK-PPT",
      type: "PREP_TASK",
      status: "OK",
      summary: "コットンサプライチェーンの説明",
      extractedItems: [
        "栽培・収穫からジニングへ進む。",
        "紡績、製織・編立、染色・仕上げ、縫製が続く。",
        "水使用など環境課題がある。",
        "人権課題への配慮が必要。",
        "認証やトレーサビリティが重要。",
      ],
      strategyItems: [],
      keyMessages: [
        "全体構造を理解する",
        "主要工程を押さえる",
        "環境課題を把握する",
        "人権課題を把握する",
        "サステナビリティ対応を知る",
      ],
      deckFrame: { slideCount: 5, masterFrameId: "titleLineFooter" },
      slideFrames: [
        {
          slideNumber: 1,
          title: "全体構造",
          layoutFrameId: "adaptiveTextMain",
          blocks: [{ id: "block1", kind: "list", styleId: "listCompact", items: ["概要"] }],
        },
        {
          slideNumber: 2,
          title: "主要工程",
          layoutFrameId: "adaptiveTextMain",
          blocks: [{ id: "block1", kind: "list", styleId: "listCompact", items: ["工程"] }],
        },
      ],
      warnings: [],
      missingInfo: [],
      nextSuggestion: [],
    });

    const completed = JSON.parse(completePresentationPlanSlideFrames(raw));

    expect(completed.slideFrames).toHaveLength(5);
    expect(completed.deckFrame.slideCount).toBe(5);
    expect(completed.slideFrames[2]).toMatchObject({
      slideNumber: 3,
      title: "環境課題を把握する",
      layoutFrameId: "adaptiveTextMain",
    });
    expect(completed.slideFrames[4].blocks[0].items[0]).toContain("認証");
  });
});
