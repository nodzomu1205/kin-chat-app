import { useCallback } from "react";
import { parseTaskInput } from "@/lib/taskInputParser";
import { formatTaskSlot } from "@/lib/app/kinStructuredProtocol";
import { resolveDraftTitle } from "@/lib/app/contextNaming";
import { resetTaskDraft } from "@/lib/app/taskDraftHelpers";
import type { Message } from "@/types/chat";
import type { TaskDraft } from "@/types/task";

type CharConstraint = {
  rule: "exact" | "at_least" | "up_to" | "around";
  limit: number;
} | null;

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
        prev.searchContext?.rawResultId === rawResultId
          ? {
              ...prev,
              searchContext: null,
              updatedAt: new Date().toISOString(),
            }
          : prev
      );
    },
    [deleteSearchHistoryItemBase, setCurrentTaskDraft]
  );

  const resetCurrentTaskDraft = useCallback(() => {
    setCurrentTaskDraft(resetTaskDraft());
    resetTaskProtocolRuntime();
    clearTaskScopedMemory();
  }, [clearTaskScopedMemory, resetTaskProtocolRuntime, setCurrentTaskDraft]);

  const getCurrentTaskCharConstraint = useCallback((): CharConstraint => {
    const constraints = currentTaskIntentConstraints || [];
    for (const item of constraints) {
      let match = item.match(/exactly\s+(\d+)\s+Japanese characters/i);
      if (match) return { rule: "exact", limit: Number(match[1]) };
      match = item.match(/at or above\s+(\d+)\s+Japanese characters/i);
      if (match) return { rule: "at_least", limit: Number(match[1]) };
      match = item.match(/at or under\s+(\d+)\s+Japanese characters/i);
      if (match) return { rule: "up_to", limit: Number(match[1]) };
      match = item.match(/around\s+(\d+)\s+Japanese characters/i);
      if (match) return { rule: "around", limit: Number(match[1]) };
    }
    return null;
  }, [currentTaskIntentConstraints]);

  const updateTaskDraftFields = useCallback(
    (patch: Partial<TaskDraft>) => {
      setCurrentTaskDraft((prev) => ({
        ...prev,
        ...patch,
        updatedAt: new Date().toISOString(),
      }));
    },
    [setCurrentTaskDraft]
  );

  const applyPrefixedTaskFieldsFromText = useCallback(
    (text: string) => {
      const parsed = parseTaskInput(text);

      if (parsed.title || parsed.userInstruction) {
        setCurrentTaskDraft((prev) => ({
          ...prev,
          title: parsed.title || prev.title,
          taskName: parsed.title?.trim() ? parsed.title.trim() : prev.taskName,
          userInstruction: parsed.userInstruction || prev.userInstruction,
          updatedAt: new Date().toISOString(),
        }));
      }

      return parsed;
    },
    [setCurrentTaskDraft]
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
      resolveDraftTitle(currentTaskDraft, {
        explicitTitle: params.explicitTitle,
        freeText: params.freeText,
        searchQuery: params.searchQuery,
        fallback: params.fallback,
      }),
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
      resolveDraftTitle(draft, {
        explicitTitle: params.explicitTitle,
        freeText: params.freeText,
        searchQuery: params.searchQuery,
        fallback: params.fallback,
      }),
    []
  );

  const getTaskBaseText = useCallback(() => {
    if (currentTaskDraft.body.trim()) return currentTaskDraft.body.trim();
    if (currentTaskDraft.mergedText.trim()) return currentTaskDraft.mergedText.trim();
    if (currentTaskDraft.deepenText.trim()) return currentTaskDraft.deepenText.trim();
    if (currentTaskDraft.prepText.trim()) return currentTaskDraft.prepText.trim();
    return "";
  }, [currentTaskDraft]);

  const syncTaskDraftFromProtocol = useCallback(
    (params: {
      taskId: string;
      title: string;
      goal: string;
      compiledTaskPrompt: string;
    }) => {
      setCurrentTaskDraft((prev) => ({
        ...prev,
        title: params.title,
        taskName: params.title,
        userInstruction: params.goal,
        body: params.compiledTaskPrompt,
        mergedText: params.compiledTaskPrompt,
        kinTaskText: params.compiledTaskPrompt,
        status: "formatted",
        updatedAt: new Date().toISOString(),
      }));
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
