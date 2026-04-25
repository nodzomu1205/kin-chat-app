import { describe, expect, it } from "vitest";
import {
  buildLimitExceededBlock,
  buildProgressAckResponseBlock,
  buildResendLastMessageBlock,
  buildTaskSuspendBlock,
  buildUserResponseBlock,
  buildYoutubeTranscriptRetryBlock,
} from "@/lib/task/taskRuntimeProtocol";
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

  it("builds shared protocol response blocks with stable wrappers", () => {
    expect(
      buildUserResponseBlock({
        taskId: "TASK-1",
        actionId: "A001",
        body: "Answer",
      })
    ).toBe(
      [
        "<<SYS_USER_RESPONSE>>",
        "TASK_ID: TASK-1",
        "ACTION_ID: A001",
        "BODY: Answer",
        "<<END_SYS_USER_RESPONSE>>",
      ].join("\n")
    );

    expect(
      buildLimitExceededBlock({
        taskId: "TASK-1",
        actionId: "A001",
        summary: "Too many requests",
      })
    ).toContain("STATUS: REJECTED_LIMIT");

    expect(buildProgressAckResponseBlock({ taskId: "TASK-1" })).toContain(
      "ACTION_ID: PROGRESS_ACK"
    );
    expect(buildResendLastMessageBlock({ taskId: "TASK-1" })).toContain(
      "ACTION_ID: RESEND_LAST_MESSAGE"
    );
    expect(
      buildYoutubeTranscriptRetryBlock({
        taskId: "TASK-1",
        actionId: "YT-1",
        url: "https://youtube.com/watch?v=1",
      })
    ).toContain("DETAIL: Failed URL: https://youtube.com/watch?v=1");
  });
});
