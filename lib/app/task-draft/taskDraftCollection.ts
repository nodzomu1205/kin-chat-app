import { generateId } from "@/lib/uuid";
import type { TaskDraft } from "@/types/task";
import { createEmptyTaskDraft } from "@/types/task";

export function createTaskDraftSlot(slot: number): TaskDraft {
  return {
    ...createEmptyTaskDraft(),
    id: generateId(),
    slot,
  };
}

export function normalizeTaskDraftSlots(taskDrafts: TaskDraft[]): TaskDraft[] {
  if (taskDrafts.length === 0) {
    return [createTaskDraftSlot(1)];
  }

  return taskDrafts.map((taskDraft, index) => ({
    ...taskDraft,
    id: taskDraft.id || generateId(),
    slot: index + 1,
  }));
}

export function appendTaskDraftSlot(taskDrafts: TaskDraft[]): TaskDraft[] {
  const normalizedDrafts = normalizeTaskDraftSlots(taskDrafts);
  return [
    ...normalizedDrafts,
    createTaskDraftSlot(normalizedDrafts.length + 1),
  ];
}

export function updateTaskDraftAtIndex(
  taskDrafts: TaskDraft[],
  index: number,
  updater: TaskDraft | ((currentTaskDraft: TaskDraft) => TaskDraft)
): TaskDraft[] {
  const normalizedDrafts = normalizeTaskDraftSlots(taskDrafts);
  const resolvedIndex =
    index >= 0 && index < normalizedDrafts.length ? index : 0;
  const currentTaskDraft = normalizedDrafts[resolvedIndex];
  const nextTaskDraft =
    typeof updater === "function" ? updater(currentTaskDraft) : updater;

  return normalizedDrafts.map((taskDraft, taskDraftIndex) =>
    taskDraftIndex === resolvedIndex
      ? {
          ...nextTaskDraft,
          id: nextTaskDraft.id || currentTaskDraft.id || generateId(),
          slot: resolvedIndex + 1,
        }
      : taskDraft
  );
}
