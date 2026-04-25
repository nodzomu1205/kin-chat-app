import type { TaskDraft, TaskSource } from "@/types/task";
import {
  createDefaultTaskName,
  createEmptyTaskDraft,
} from "@/types/task";
import { generateId } from "@/lib/shared/uuid";

export function createTaskSource(
  type: TaskSource["type"],
  label: string,
  content: string
): TaskSource {
  return {
    id: generateId(),
    type,
    label,
    content,
    createdAt: new Date().toISOString(),
  };
}

export function resetTaskDraft(): TaskDraft {
  return createEmptyTaskDraft();
}

export function resolveTaskName(
  current: TaskDraft,
  fallback?: string
): string {
  return (
    current.taskName ||
    current.title ||
    (fallback && fallback.trim()) ||
    createDefaultTaskName()
  );
}

export function syncTaskDraftName(
  draft: TaskDraft,
  nextName?: string
): TaskDraft {
  const resolved = (nextName && nextName.trim()) || draft.taskName || draft.title;

  return {
    ...draft,
    taskName: resolved,
    title: resolved,
  };
}
