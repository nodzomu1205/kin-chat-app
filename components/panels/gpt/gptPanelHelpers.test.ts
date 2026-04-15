import { describe, expect, it } from "vitest";
import { resolveFloatingLabel } from "@/components/panels/gpt/gptPanelHelpers";
import { createEmptyTaskDraft } from "@/types/task";

describe("resolveFloatingLabel", () => {
  it("does not keep showing the last user message when memory topic is empty", () => {
    const label = resolveFloatingLabel({
      activeDrawer: null,
      bottomTab: "chat",
      currentTaskDraft: createEmptyTaskDraft(),
      currentTopic: "",
    });

    expect(label.value).toBe("");
  });

  it("shows the current memory topic on the chat view", () => {
    const label = resolveFloatingLabel({
      activeDrawer: null,
      bottomTab: "chat",
      currentTaskDraft: createEmptyTaskDraft(),
      currentTopic: "Japanese history",
    });

    expect(label.kind).toBe("トピック");
    expect(label.value).toBe("Japanese history");
  });

  it("does not use memory currentTask as a task-tab fallback", () => {
    const label = resolveFloatingLabel({
      activeDrawer: null,
      bottomTab: "task_secondary",
      currentTaskDraft: createEmptyTaskDraft(),
      currentTopic: "Modern literature",
    });

    expect(label.kind).toBe("トピック");
    expect(label.value).toBe("Modern literature");
  });
});
