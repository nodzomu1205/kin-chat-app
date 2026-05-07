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
      title: "Market scan",
      filename: expect.stringMatching(/^Market scan \[\d+chars\]\.txt$/),
      taskId: "T-001",
      structuredPayload: expect.objectContaining({
        version: "0.1-task-snapshot",
        documentId: expect.stringMatching(/^task_/),
      }),
    });
    expect(document?.text).toContain("Document ID: task_");
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

  it("does not duplicate an existing task snapshot title prefix", () => {
    expect(
      getTaskDraftLibraryTitle({
        ...createEmptyTaskDraft(),
        title: "Task Snapshot - Market scan",
      })
    ).toBe("Market scan");
  });

  it("stores presentation mode drafts as presentation plan documents", () => {
    const taskDraft = {
      ...createEmptyTaskDraft(),
      mode: "presentation" as const,
      title: "Investor deck",
      body: "【PPT設計書】\n■ スライド設計\n- 1枚目: タイトル",
      presentationPlan: {
        version: "0.1-presentation-task-plan" as const,
        title: "Investor deck",
        sourceSummary: "",
        extractedItems: [],
        strategyItems: [],
        keyMessages: [],
        slideItems: ["1枚目: タイトル"],
        slideFrames: [],
        slides: [],
        missingInfo: [],
        nextSuggestions: [],
        updatedAt: "2026-04-29T00:00:00.000Z",
      },
    };

    const document = buildStoredDocumentFromTaskDraft(taskDraft);

    expect(document).toMatchObject({
      artifactType: "presentation_plan",
      title: "PPT Design - Investor deck",
      structuredPayload: expect.objectContaining({
        version: "0.1-presentation-task-plan",
        documentId: expect.stringMatching(/^ppt_/),
        title: "Investor deck",
      }),
    });
    expect(document?.text).toContain("Document ID: ppt_");
  });
});
