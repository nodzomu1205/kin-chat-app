import { describe, expect, it } from "vitest";
import { buildTaskPrompt } from "@/lib/task/taskProtocol";
import type { TaskRequest } from "@/types/task";

const baseTask: TaskRequest = {
  type: "PREP_TASK",
  taskId: "task_1",
  dataKind: "mixed_package",
  goal: "Create a PPT design.",
  inputRef: "chat",
  inputSummary: "Source material",
  constraints: [],
  outputFormat: "presentation_plan",
  priority: "MID",
  visibility: "USER_VISIBLE",
  responseMode: "STRUCTURED_RESULT",
};

describe("taskProtocol presentation plan prompt", () => {
  it("constrains image library IDs to an allowlist and exposes adaptive fields", () => {
    const prompt = buildTaskPrompt(baseTask);

    expect(prompt).toContain("adaptiveVisualMain");
    expect(prompt).toContain("adaptiveTextMain");
    expect(prompt).toContain("slideRole");
    expect(prompt).toContain("candidateImageIds");
    expect(prompt).toContain("closed allowlist");
    expect(prompt).toContain("never invent");
    expect(prompt).toContain("useOneOrMore");
    expect(prompt).toContain("matching candidateImageIds exactly");
    expect(prompt).toContain("Caption seed");
    expect(prompt).toContain("do not use summaryClosing");
  });
});
