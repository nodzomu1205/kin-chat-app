import { useCallback, useState } from "react";
import { createEmptyTaskDraft } from "@/types/task";
import type { TaskDraft } from "@/types/task";
import {
  appendTaskDraftSlot,
  createTaskDraftSlot,
  normalizeTaskDraftSlots,
  updateTaskDraftAtIndex,
} from "@/lib/app/task-draft/taskDraftCollection";
import {
  buildRegisteredTask,
  canRegisterTaskDraft,
  createDefaultTaskRegistrationLibrarySettings,
  createDefaultTaskRegistrationRecurrence,
  normalizeTaskRegistrationLibrarySettings,
  removeRegisteredTask,
  updateRegisteredTask,
  type RegisteredTask,
  type TaskRegistrationLibrarySettings,
  type TaskRegistrationRecurrence,
} from "@/lib/app/task-registration/taskRegistration";
import { buildTaskDraftProjectionFromProtocol } from "@/lib/task/taskDraftProjection";
import type { TaskIntent } from "@/types/taskProtocol";

export function useTaskDraftWorkspace() {
  const [taskDrafts, setTaskDrafts] = useState<TaskDraft[]>([createTaskDraftSlot(1)]);
  const [activeTaskDraftIndex, setActiveTaskDraftIndex] = useState(0);
  const [taskRegistrationDraft, setTaskRegistrationDraft] = useState<TaskDraft>(
    createTaskDraftSlot(1)
  );
  const [registeredTasks, setRegisteredTasks] = useState<RegisteredTask[]>([]);
  const [taskRegistrationIntent, setTaskRegistrationIntent] =
    useState<TaskIntent | undefined>(undefined);
  const [editingRegisteredTaskId, setEditingRegisteredTaskId] = useState<
    string | null
  >(null);
  const [taskRegistrationLibrarySettings, setTaskRegistrationLibrarySettings] =
    useState<TaskRegistrationLibrarySettings>(
      createDefaultTaskRegistrationLibrarySettings
    );
  const [taskRegistrationRecurrence, setTaskRegistrationRecurrence] =
    useState<TaskRegistrationRecurrence>(
      createDefaultTaskRegistrationRecurrence
    );

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

  const registerCurrentTaskDraft = useCallback(() => {
    if (!canRegisterTaskDraft(taskRegistrationDraft)) return;
    setRegisteredTasks((prev) => [
      buildRegisteredTask({
        draft: taskRegistrationDraft,
        intent: taskRegistrationIntent,
        librarySettings: taskRegistrationLibrarySettings,
        recurrence: taskRegistrationRecurrence,
      }),
      ...prev,
    ]);
    setEditingRegisteredTaskId(null);
  }, [
    taskRegistrationDraft,
    taskRegistrationIntent,
    taskRegistrationLibrarySettings,
    taskRegistrationRecurrence,
  ]);

  const saveCurrentTaskDraftToRegisteredTask = useCallback((taskId: string) => {
    if (!canRegisterTaskDraft(taskRegistrationDraft)) return;
    setRegisteredTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? updateRegisteredTask(task, {
              draft: taskRegistrationDraft,
              intent: taskRegistrationIntent,
              librarySettings: taskRegistrationLibrarySettings,
              recurrence: taskRegistrationRecurrence,
            })
          : task
      )
    );
    setEditingRegisteredTaskId(null);
  }, [
    taskRegistrationDraft,
    taskRegistrationIntent,
    taskRegistrationLibrarySettings,
    taskRegistrationRecurrence,
  ]);

  const editRegisteredTask = useCallback(
    (task: RegisteredTask) => {
      setEditingRegisteredTaskId(task.id);
      setTaskRegistrationDraft(task.draft);
      setTaskRegistrationIntent(task.intent);
      setTaskRegistrationLibrarySettings(
        normalizeTaskRegistrationLibrarySettings(task.librarySettings)
      );
      setTaskRegistrationRecurrence(task.recurrence);
    },
    []
  );

  const deleteRegisteredTask = useCallback((taskId: string) => {
    setRegisteredTasks((prev) => {
      const deleted = prev.find((task) => task.id === taskId);
      if (
        deleted &&
        (deleted.draft.taskId === taskRegistrationDraft.taskId ||
          deleted.draft.kinTaskText === taskRegistrationDraft.kinTaskText)
      ) {
        setTaskRegistrationDraft(createTaskDraftSlot(1));
        setTaskRegistrationIntent(undefined);
        setEditingRegisteredTaskId(null);
      }
      return removeRegisteredTask(prev, taskId);
    });
  }, [taskRegistrationDraft]);

  const cancelTaskRegistrationEdit = useCallback(() => {
    setEditingRegisteredTaskId(null);
    setTaskRegistrationDraft(createTaskDraftSlot(1));
    setTaskRegistrationIntent(undefined);
  }, []);

  const syncTaskRegistrationDraftFromProtocol = useCallback(
    (params: {
      taskId: string;
      title: string;
      goal: string;
      compiledTaskPrompt: string;
      originalInstruction?: string;
      intent?: TaskIntent;
    }) => {
      setEditingRegisteredTaskId(null);
      setTaskRegistrationIntent(params.intent);
      setTaskRegistrationDraft((prev) =>
        buildTaskDraftProjectionFromProtocol(prev, params)
      );
    },
    []
  );

  return {
    taskDrafts,
    activeTaskDraftIndex,
    currentTaskDraft,
    taskRegistrationDraft,
    editingRegisteredTaskId,
    setCurrentTaskDraft,
    setTaskRegistrationDraft,
    syncTaskRegistrationDraftFromProtocol,
    selectPreviousTaskDraft,
    selectNextTaskDraft,
    registeredTasks,
    taskRegistrationLibrarySettings,
    setTaskRegistrationLibrarySettings,
    taskRegistrationRecurrence,
    setTaskRegistrationRecurrence,
    registerCurrentTaskDraft,
    saveCurrentTaskDraftToRegisteredTask,
    editRegisteredTask,
    deleteRegisteredTask,
    cancelTaskRegistrationEdit,
  };
}
