import { describe, expect, it } from "vitest";
import { buildChatPageTaskSnapshotDocument } from "@/hooks/chatPagePanelCompositionBuilders";
import { createEmptyTaskDraft } from "@/types/task";

describe("chatPagePanelCompositionBuilders", () => {
  it("builds a task snapshot document only when the task draft has content", () => {
    expect(
      buildChatPageTaskSnapshotDocument({
        task: {
          currentTaskDraft: {
            ...createEmptyTaskDraft(),
            id: "draft-1",
            title: "Task title",
            userInstruction: "Do the work",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        } as never,
      })
    ).toMatchObject({
      title: "Task Snapshot - Task title",
    });
  });

  it("returns null for an empty task snapshot", () => {
    expect(
      buildChatPageTaskSnapshotDocument({
        task: {
          currentTaskDraft: {
            ...createEmptyTaskDraft(),
            id: "draft-1",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        } as never,
      })
    ).toBeNull();
  });
});
