import { useCallback, useState } from "react";
import { createEmptyTaskDraft } from "@/types/task";
import type { TaskDraft } from "@/types/task";
import {
  appendTaskDraftSlot,
  createTaskDraftSlot,
  normalizeTaskDraftSlots,
  updateTaskDraftAtIndex,
} from "@/lib/app/task-draft/taskDraftCollection";

export function useTaskDraftWorkspace() {
  const [taskDrafts, setTaskDrafts] = useState<TaskDraft[]>([createTaskDraftSlot(1)]);
  const [activeTaskDraftIndex, setActiveTaskDraftIndex] = useState(0);

  const currentTaskDraft =
    taskDrafts[activeTaskDraftIndex] || taskDrafts[0] || createEmptyTaskDraft();

  const setCurrentTaskDraft = useCallback<React.Dispatch<React.SetStateAction<TaskDraft>>>(
    (updater) => {
      setTaskDrafts((prev) => updateTaskDraftAtIndex(prev, activeTaskDraftIndex, updater));
    },
    [activeTaskDraftIndex]
  );

  const selectPreviousTaskDraft = useCallback(() => {
    setActiveTaskDraftIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const selectNextTaskDraft = useCallback(() => {
    setTaskDrafts((prev) => {
      const normalizedDrafts = normalizeTaskDraftSlots(prev);
      return activeTaskDraftIndex >= normalizedDrafts.length - 1
        ? appendTaskDraftSlot(normalizedDrafts)
        : normalizedDrafts;
    });
    setActiveTaskDraftIndex((prev) => prev + 1);
  }, [activeTaskDraftIndex]);

  return {
    taskDrafts,
    activeTaskDraftIndex,
    currentTaskDraft,
    setCurrentTaskDraft,
    selectPreviousTaskDraft,
    selectNextTaskDraft,
  };
}
