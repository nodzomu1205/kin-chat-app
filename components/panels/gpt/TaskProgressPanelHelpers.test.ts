import { describe, expect, it } from "vitest";
import {
  buildTaskProgressOutput,
  normalizeTaskStatusForOutput,
} from "@/components/panels/gpt/TaskProgressPanelHelpers";
import type { TaskProgressView } from "@/components/panels/gpt/gptPanelTypes";

const baseView: TaskProgressView = {
  taskId: "task-1",
  taskTitle: "Task title",
  goal: "Goal",
  taskStatus: "running",
  latestSummary: "",
  requirementProgress: [],
  userFacingRequests: [],
};

describe("TaskProgressPanelHelpers", () => {
  it("normalizes task statuses for SYS_TASK_CONFIRM output", () => {
    expect(normalizeTaskStatusForOutput("running")).toBe("RUNNING");
    expect(normalizeTaskStatusForOutput("completed")).toBe("COMPLETED");
    expect(normalizeTaskStatusForOutput("suspended")).toBe("READY_TO_RESUME");
    expect(normalizeTaskStatusForOutput("waiting_user")).toBe("READY_TO_RESUME");
    expect(normalizeTaskStatusForOutput("ready_to_resume")).toBe(
      "READY_TO_RESUME"
    );
  });

  it("builds empty progress and request sections", () => {
    expect(buildTaskProgressOutput(baseView)).toContain("PROGRESS:\n- none");
    expect(buildTaskProgressOutput(baseView)).toContain(
      "PENDING_REQUESTS:\n- none"
    );
  });

  it("builds requirement counts and pending requests", () => {
    const output = buildTaskProgressOutput({
      ...baseView,
      taskStatus: "suspended",
      requirementProgress: [
        {
          id: "req-1",
          label: "Write draft",
          category: "required",
          kind: "ask_gpt",
          completedCount: 2,
          targetCount: 3,
          status: "in_progress",
        },
        {
          id: "opt-1",
          label: "Add appendix",
          category: "optional",
          kind: "finalize",
          completedCount: 1,
          status: "done",
        },
      ],
      userFacingRequests: [
        {
          requestId: "user-1",
          taskId: "task-1",
          actionId: "ACT-1",
          kind: "question",
          status: "pending",
          body: "Which tone should be used?",
          required: true,
          createdAt: 0,
        },
      ],
    });

    expect(output).toContain("STATUS: READY_TO_RESUME");
    expect(output).toContain(
      "- Write draft: 2/3 (required, in_progress)"
    );
    expect(output).toContain("- Add appendix: 1 (optional, done)");
    expect(output).toContain(
      "- ACT-1 [question] pending: Which tone should be used?"
    );
  });
});
