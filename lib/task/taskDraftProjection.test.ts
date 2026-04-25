import { describe, expect, it } from "vitest";
import {
  buildTaskDraftProjectionFromProtocol,
  resolveTaskDraftUserInstruction,
} from "@/lib/task/taskDraftProjection";
import { createEmptyTaskDraft } from "@/types/task";

describe("taskDraftProjection", () => {
  it("prefers original instruction over goal for the editable draft projection", () => {
    expect(
      resolveTaskDraftUserInstruction({
        originalInstruction: "  farmers 360 strategy request  ",
        goal: "Reduced goal",
      })
    ).toBe("farmers 360 strategy request");
  });

  it("falls back to goal when no original instruction is available", () => {
    expect(
      resolveTaskDraftUserInstruction({
        originalInstruction: " ",
        goal: "Reduced goal",
      })
    ).toBe("Reduced goal");
  });

  it("builds a formatted draft projection from protocol data", () => {
    const result = buildTaskDraftProjectionFromProtocol(createEmptyTaskDraft(), {
      title: "Prepared task",
      goal: "Reduced goal",
      compiledTaskPrompt: "<<SYS_TASK>>\nBODY: Task body.\n<<END_SYS_TASK>>",
      originalInstruction: "Full user instruction",
    });

    expect(result.title).toBe("Prepared task");
    expect(result.taskName).toBe("Prepared task");
    expect(result.userInstruction).toBe("Full user instruction");
    expect(result.body).toContain("<<SYS_TASK>>");
    expect(result.kinTaskText).toContain("<<SYS_TASK>>");
    expect(result.status).toBe("formatted");
  });
});
