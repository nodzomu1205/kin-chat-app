import { beforeEach, describe, expect, it, vi } from "vitest";
import { callOpenAIResponses } from "@/lib/server/chatgpt/openaiClient";
import { handleTaskRoute } from "@/lib/server/task/routeHandlers";
import type { TaskRequest } from "@/types/task";

vi.mock("@/lib/server/chatgpt/openaiClient", () => ({
  callOpenAIResponses: vi.fn(),
}));

const mockedCallOpenAIResponses = vi.mocked(callOpenAIResponses);

beforeEach(() => {
  mockedCallOpenAIResponses.mockReset();
});

const presentationTask: TaskRequest = {
  type: "PREP_TASK",
  taskId: "TASK-PPT",
  dataKind: "document_package",
  goal: "Create PPT design",
  inputRef: "ppt",
  inputSummary: "ユーザー指示: なし\n入力本文: コットンサプライチェーン",
  constraints: [],
  outputFormat: "presentation_plan",
  priority: "MID",
  visibility: "USER_VISIBLE",
  responseMode: "STRUCTURED_RESULT",
};

function planJson(slideCount: number, keyMessageCount: number) {
  return JSON.stringify({
    taskId: "TASK-PPT",
    type: "PREP_TASK",
    status: "OK",
    summary: "PPT design",
    extractedItems: [],
    strategyItems: [],
    keyMessages: Array.from({ length: keyMessageCount }, (_, index) => `Message ${index + 1}`),
    deckFrame: { slideCount, masterFrameId: "titleLineFooter" },
    slideFrames: Array.from({ length: slideCount }, (_, index) => ({
      slideNumber: index + 1,
      title: `Slide ${index + 1}`,
      layoutFrameId: "titleBody",
      blocks: [{ id: "block1", kind: "list", styleId: "listCompact", items: ["Point"] }],
    })),
    warnings: [],
    missingInfo: [],
    nextSuggestion: [],
  });
}

describe("handleTaskRoute", () => {
  it("completes an internally incomplete presentation plan once", async () => {
    mockedCallOpenAIResponses
      .mockResolvedValueOnce({
        data: {},
        text: planJson(1, 5),
        usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
        usageDetails: null,
      })
      .mockResolvedValueOnce({
        data: {},
        text: planJson(5, 5),
        usage: { inputTokens: 11, outputTokens: 22, totalTokens: 33 },
        usageDetails: null,
      });

    const response = await handleTaskRoute({ task: presentationTask });
    const body = await response.json();

    expect(mockedCallOpenAIResponses).toHaveBeenCalledTimes(2);
    expect(mockedCallOpenAIResponses.mock.calls[1]?.[0].input).toContain(
      "The previous JSON was structurally incomplete."
    );
    expect(body.usage).toEqual({ inputTokens: 21, outputTokens: 42, totalTokens: 63 });
  });

  it("repairs an incomplete completion response instead of returning a 500", async () => {
    mockedCallOpenAIResponses
      .mockResolvedValueOnce({
        data: {},
        text: planJson(2, 5),
        usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
        usageDetails: null,
      })
      .mockResolvedValueOnce({
        data: {},
        text: planJson(2, 5),
        usage: { inputTokens: 11, outputTokens: 22, totalTokens: 33 },
        usageDetails: null,
      });

    const response = await handleTaskRoute({ task: presentationTask });
    const body = await response.json();
    const slideFrameJson = body.parsed.detailBlocks.find(
      (block: { title: string }) => block.title === "Slide Frame JSON"
    )?.body[0];
    const parsedFrame = JSON.parse(slideFrameJson);

    expect(mockedCallOpenAIResponses).toHaveBeenCalledTimes(2);
    expect(parsedFrame.slideFrames).toHaveLength(5);
    expect(parsedFrame.deckFrame.slideCount).toBe(5);
  });
});
