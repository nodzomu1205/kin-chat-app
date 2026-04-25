import { describe, expect, it } from "vitest";
import type { TaskDraft } from "@/types/task";
import { createEmptyTaskDraft } from "@/types/task";
import {
  appendTaskDraftSlot,
  createTaskDraftSlot,
  normalizeTaskDraftSlots,
  updateTaskDraftAtIndex,
} from "@/lib/app/task-draft/taskDraftCollection";

function buildDraft(patch: Partial<TaskDraft>): TaskDraft {
  return {
    ...createEmptyTaskDraft(),
    ...patch,
  };
}

describe("taskDraftCollection", () => {
  it("normalizes slots and ids", () => {
    const drafts = normalizeTaskDraftSlots([
      buildDraft({ slot: 3, title: "First" }),
      buildDraft({ slot: 8, title: "Second", id: "keep-me" }),
    ]);

    expect(drafts).toHaveLength(2);
    expect(drafts[0].slot).toBe(1);
    expect(drafts[0].id).not.toBe("");
    expect(drafts[1].slot).toBe(2);
    expect(drafts[1].id).toBe("keep-me");
  });

  it("appends a fresh draft slot to the end", () => {
    const drafts = appendTaskDraftSlot([createTaskDraftSlot(1)]);

    expect(drafts).toHaveLength(2);
    expect(drafts[1].slot).toBe(2);
    expect(drafts[1].id).not.toBe("");
  });

  it("updates only the active draft index", () => {
    const drafts = updateTaskDraftAtIndex(
      [buildDraft({ title: "A", id: "a", slot: 1 }), buildDraft({ title: "B", id: "b", slot: 2 })],
      1,
      (currentTaskDraft) => ({
        ...currentTaskDraft,
        title: "Updated",
      })
    );

    expect(drafts[0].title).toBe("A");
    expect(drafts[1].title).toBe("Updated");
    expect(drafts[1].id).toBe("b");
    expect(drafts[1].slot).toBe(2);
  });
});
