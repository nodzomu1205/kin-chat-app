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
  it("uses visual slots instead of exposing image-library IDs", () => {
    const prompt = buildTaskPrompt(baseTask);

    expect(prompt).toContain("adaptiveVisualMain");
    expect(prompt).toContain("adaptiveTextMain");
    expect(prompt).toContain("slideRole");
    expect(prompt).toContain("visualSlots");
    expect(prompt).toContain("visualRequest.visualSlots");
    expect(prompt).toContain("Asset identifiers are intentionally hidden");
    expect(prompt).toContain("useOneOrMore");
    expect(prompt).toContain("cultivation, ginning, and spinning");
    expect(prompt).toContain("Use the user's/source language");
    expect(prompt).toContain("must not be narrower than visualSlot.need");
    expect(prompt).toContain("Do not assert a specific country, location, company, person, or named system");
    expect(prompt).not.toContain("candidateImageIds");
    expect(prompt).not.toContain("closed allowlist");
    expect(prompt).not.toContain("Caption seed");
    expect(prompt).toContain("do not use summaryClosing");
  });
});
