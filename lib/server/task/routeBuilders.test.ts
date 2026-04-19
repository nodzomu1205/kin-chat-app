import { describe, expect, it } from "vitest";
import {
  buildTaskResponsesRequest,
  buildTaskRouteResponse,
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
});
