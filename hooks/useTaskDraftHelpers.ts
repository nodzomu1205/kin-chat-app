import { useCallback } from "react";
import { formatTaskSlot } from "@/lib/app/kin-protocol/kinStructuredProtocol";
import { resetTaskDraft } from "@/lib/app/task-draft/taskDraftHelpers";
import {
  buildRemovedSearchContextDraft,
  buildTaskDraftFromPrefixedText,
  buildUpdatedTaskDraft,
  resolveCurrentTaskCharConstraint,
  resolveTaskBaseText,
  resolveTaskTitle,
  type TaskCharConstraint,
} from "@/lib/app/task-draft/taskDraftActionBuilders";
import {
  buildTaskDraftProjectionFromProtocol,
  type TaskDraftProtocolProjectionParams,
} from "@/lib/task/taskDraftProjection";
import type { Message } from "@/types/chat";
import type { TaskDraft } from "@/types/task";

export function useTaskDraftHelpers(args: {
  currentTaskDraft: TaskDraft;
  gptMessages: Message[];
  setCurrentTaskDraft: React.Dispatch<React.SetStateAction<TaskDraft>>;
  resetTaskProtocolRuntime: () => void;
  clearTaskScopedMemory: () => void;
  deleteSearchHistoryItemBase: (rawResultId: string) => void;
  currentTaskIntentConstraints: string[];
}) {
  const {
    currentTaskDraft,
    setCurrentTaskDraft,
    resetTaskProtocolRuntime,
    clearTaskScopedMemory,
    deleteSearchHistoryItemBase,
    currentTaskIntentConstraints,
  } = args;

  const deleteSearchHistoryItem = useCallback(
    (rawResultId: string) => {
      deleteSearchHistoryItemBase(rawResultId);
      setCurrentTaskDraft((prev) =>
        buildRemovedSearchContextDraft(prev, rawResultId, new Date().toISOString())
      );
    },
    [deleteSearchHistoryItemBase, setCurrentTaskDraft]
  );

  const resetCurrentTaskDraft = useCallback(() => {
    setCurrentTaskDraft(resetTaskDraft());
    resetTaskProtocolRuntime();
    clearTaskScopedMemory();
  }, [clearTaskScopedMemory, resetTaskProtocolRuntime, setCurrentTaskDraft]);

  const getCurrentTaskCharConstraint = useCallback((): TaskCharConstraint => {
    return resolveCurrentTaskCharConstraint(currentTaskIntentConstraints);
  }, [currentTaskIntentConstraints]);

  const updateTaskDraftFields = useCallback(
    (patch: Partial<TaskDraft>) => {
      setCurrentTaskDraft((prev) =>
        buildUpdatedTaskDraft(prev, patch, new Date().toISOString())
      );
    },
    [setCurrentTaskDraft]
  );

  const applyPrefixedTaskFieldsFromText = useCallback(
    (text: string) => {
      const updatedAt = new Date().toISOString();
      const { parsed } = buildTaskDraftFromPrefixedText(
        currentTaskDraft,
        text,
        updatedAt
      );
      setCurrentTaskDraft((prev) =>
        buildTaskDraftFromPrefixedText(prev, text, updatedAt).draft
      );

      return parsed;
    },
    [currentTaskDraft, setCurrentTaskDraft]
  );

  const getTaskSlotLabel = useCallback(
    () => formatTaskSlot(currentTaskDraft.slot),
    [currentTaskDraft.slot]
  );

  const getResolvedTaskTitle = useCallback(
    (params: {
      explicitTitle?: string;
      freeText?: string;
      searchQuery?: string;
      fallback?: string;
    }) =>
      resolveTaskTitle(currentTaskDraft, params),
    [currentTaskDraft]
  );

  const resolveTaskTitleFromDraft = useCallback(
    (
      draft: TaskDraft,
      params: {
        explicitTitle?: string;
        freeText?: string;
        searchQuery?: string;
        fallback?: string;
      }
    ) =>
      resolveTaskTitle(draft, params),
    []
  );

  const getTaskBaseText = useCallback(() => {
    return resolveTaskBaseText(currentTaskDraft);
  }, [currentTaskDraft]);

  const syncTaskDraftFromProtocol = useCallback(
    (params: { taskId: string } & TaskDraftProtocolProjectionParams) => {
      setCurrentTaskDraft((prev) =>
        buildTaskDraftProjectionFromProtocol(prev, params)
      );
    },
    [setCurrentTaskDraft]
  );

  return {
    deleteSearchHistoryItem,
    resetCurrentTaskDraft,
    getCurrentTaskCharConstraint,
    updateTaskDraftFields,
    applyPrefixedTaskFieldsFromText,
    getTaskSlotLabel,
    getResolvedTaskTitle,
    resolveTaskTitleFromDraft,
    getTaskBaseText,
    syncTaskDraftFromProtocol,
  };
}
