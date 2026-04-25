import { describe, expect, it } from "vitest";
import { ingestTaskProtocolEventsState } from "@/lib/task/taskProtocolIngest";
import type { TaskRuntimeState } from "@/types/taskProtocol";

function createRuntime(overrides: Partial<TaskRuntimeState> = {}): TaskRuntimeState {
  return {
    currentTaskId: "123456",
    currentTaskTitle: "Test Task",
    currentTaskIntent: null,
    originalInstruction: "",
    compiledTaskPrompt: "",
    taskStatus: "running",
    latestSummary: "",
    requirementProgress: [],
    pendingRequests: [],
    userFacingRequests: [],
    completedSearches: [],
    protocolLog: [],
    ...overrides,
  };
}

describe("ingestTaskProtocolEventsState", () => {
  it("adds a protocol event and updates user-facing requests", () => {
    const next = ingestTaskProtocolEventsState(createRuntime(), {
      direction: "kin_to_gpt",
      events: [
        {
          type: "user_question",
          taskId: "123456",
          actionId: "Q001",
          body: "Need clarification",
        },
      ],
      createActionId: () => "AUTO001",
      now: () => 1000,
    });

    expect(next.pendingRequests).toHaveLength(1);
    expect(next.userFacingRequests).toHaveLength(1);
    expect(next.protocolLog).toHaveLength(1);
  });

  it("skips duplicate protocol events by action id", () => {
    const initial = createRuntime({
      protocolLog: [
        {
          taskId: "123456",
          direction: "kin_to_gpt",
          type: "search_request",
          body: "S001 search this",
          createdAt: 1000,
        },
      ],
    });

    const next = ingestTaskProtocolEventsState(initial, {
      direction: "kin_to_gpt",
      events: [
        {
          type: "search_request",
          taskId: "123456",
          actionId: "S001",
          body: "search this",
        },
      ],
      createActionId: () => "AUTO001",
      now: () => 2000,
    });

    expect(next.protocolLog).toHaveLength(1);
  });

  it("uses generated action ids when events omit them", () => {
    const next = ingestTaskProtocolEventsState(createRuntime(), {
      direction: "kin_to_gpt",
      events: [
        {
          type: "user_question",
          taskId: "123456",
          body: "Need your input",
        },
      ],
      createActionId: () => "AUTO123",
      now: () => 3000,
    });

    expect(next.pendingRequests[0]?.actionId).toBe("AUTO123");
  });
});
