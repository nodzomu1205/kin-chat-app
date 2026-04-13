import { describe, expect, it } from "vitest";
import {
  answerPendingTaskRequestState,
  applyFinalizeReviewedState,
} from "@/lib/taskProtocolMutations";
import type { TaskRuntimeState } from "@/types/taskProtocol";

function createRuntime(overrides: Partial<TaskRuntimeState> = {}): TaskRuntimeState {
  return {
    currentTaskId: "123456",
    currentTaskTitle: "Test Task",
    currentTaskIntent: null,
    compiledTaskPrompt: "",
    taskStatus: "running",
    latestSummary: "Current summary",
    requirementProgress: [],
    pendingRequests: [],
    userFacingRequests: [],
    completedSearches: [],
    protocolLog: [],
    ...overrides,
  };
}

describe("taskProtocolMutations", () => {
  it("marks a pending request as answered and hides it from user-facing requests", () => {
    const next = answerPendingTaskRequestState(
      createRuntime({
        pendingRequests: [
          {
            id: "REQ1",
            taskId: "123456",
            actionId: "Q001",
            target: "user",
            kind: "question",
            body: "Need clarification",
            status: "pending",
            createdAt: 1000,
            required: true,
          },
        ],
        userFacingRequests: [
          {
            requestId: "REQ1",
            taskId: "123456",
            actionId: "Q001",
            kind: "question",
            body: "Need clarification",
            required: true,
            status: "pending",
            createdAt: 1000,
          },
        ],
      }),
      {
        requestId: "REQ1",
        answerText: "Here is the answer",
        answeredAt: 2000,
      }
    );

    expect(next.taskStatus).toBe("ready_to_resume");
    expect(next.pendingRequests[0]?.status).toBe("answered");
    expect(next.pendingRequests[0]?.answerText).toBe("Here is the answer");
    expect(next.userFacingRequests).toHaveLength(0);
  });

  it("marks finalize as done when accepted", () => {
    const next = applyFinalizeReviewedState(
      createRuntime({
        requirementProgress: [
          {
            id: "finalize",
            label: "Finalize",
            category: "required",
            kind: "finalize",
            targetCount: 1,
            completedCount: 0,
            status: "in_progress",
          },
        ],
      }),
      {
        accepted: true,
        summary: "Final output approved",
      }
    );

    expect(next.taskStatus).toBe("completed");
    expect(next.latestSummary).toBe("Final output approved");
    expect(next.requirementProgress[0]?.status).toBe("done");
    expect(next.requirementProgress[0]?.completedCount).toBe(1);
  });

  it("returns finalize to in_progress when not accepted", () => {
    const next = applyFinalizeReviewedState(
      createRuntime({
        requirementProgress: [
          {
            id: "finalize",
            label: "Finalize",
            category: "required",
            kind: "finalize",
            targetCount: 1,
            completedCount: 1,
            status: "done",
          },
        ],
      }),
      {
        accepted: false,
      }
    );

    expect(next.taskStatus).toBe("running");
    expect(next.requirementProgress[0]?.status).toBe("in_progress");
    expect(next.requirementProgress[0]?.completedCount).toBe(0);
  });
});
