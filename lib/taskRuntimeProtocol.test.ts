import { describe, expect, it } from "vitest";
import { buildTaskSuspendBlock } from "@/lib/taskRuntimeProtocol";
import type { TaskRuntimeState } from "@/types/taskProtocol";

function createRuntime(): TaskRuntimeState {
  return {
    currentTaskId: "123456",
    currentTaskTitle: "Test Task",
    currentTaskIntent: null,
    originalInstruction: "",
    compiledTaskPrompt: "",
    taskStatus: "running",
    latestSummary: "Waiting for user feedback",
    requirementProgress: [],
    pendingRequests: [],
    userFacingRequests: [],
    completedSearches: [],
    protocolLog: [],
  };
}

describe("taskRuntimeProtocol", () => {
  it("builds a suspend block for the current task", () => {
    const block = buildTaskSuspendBlock(createRuntime(), "Hold until the user replies.");

    expect(block).toContain("<<SYS_TASK_CONFIRM>>");
    expect(block).toContain("TASK_ID: 123456");
    expect(block).toContain("STATUS: SUSPENDED");
    expect(block).toContain("Hold until the user replies.");
  });
});
