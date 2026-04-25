import { describe, expect, it } from "vitest";
import { createEmptyTaskDraft } from "@/types/task";
import {
  buildStoredDocumentFromTaskDraft,
  getTaskDraftLibraryTitle,
} from "@/lib/app/task-draft/taskDraftLibrary";

describe("taskDraftLibrary", () => {
  it("builds a stored document from the current task draft", () => {
    const taskDraft = {
      ...createEmptyTaskDraft(),
      taskId: "T-001",
      title: "Market scan",
      userInstruction: "Compare three competitors.",
      body: "Short summary of the task.",
      mergedText: "Short summary of the task.\n\nLonger detailed task body.",
    };

    const document = buildStoredDocumentFromTaskDraft(taskDraft);

    expect(document).toMatchObject({
      title: "Task Snapshot - Market scan",
      filename: "Task Snapshot - Market scan [127chars].txt",
      taskId: "T-001",
    });
    expect(document?.text).toContain("Instruction");
    expect(document?.text).not.toContain("\nSummary\n");
    expect(document?.text).toContain("Full");
    expect(document?.summary).toBe("Short summary of the task.");
  });

  it("returns null when there is nothing meaningful to save", () => {
    expect(buildStoredDocumentFromTaskDraft(createEmptyTaskDraft())).toBeNull();
  });

  it("falls back to a generic title when the draft is untitled", () => {
    expect(getTaskDraftLibraryTitle(createEmptyTaskDraft())).toBe("Task Snapshot");
  });
});
