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
  deleteSearchHistoryItemBase: (rawResultId: string) => void;
  currentTaskIntentConstraints: string[];
}) {
  const deleteSearchHistoryItem = useCallback(
    (rawResultId: string) => {
      args.deleteSearchHistoryItemBase(rawResultId);
      args.setCurrentTaskDraft((prev) =>
        prev.searchContext?.rawResultId === rawResultId
          ? {
              ...prev,
              searchContext: null,
              updatedAt: new Date().toISOString(),
            }
          : prev
      );
    },
    [args]
  );

  const resetCurrentTaskDraft = useCallback(() => {
    args.setCurrentTaskDraft(resetTaskDraft());
    args.resetTaskProtocolRuntime();
  }, [args]);

  const getCurrentTaskCharConstraint = useCallback((): CharConstraint => {
    const constraints = args.currentTaskIntentConstraints || [];
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
  }, [args.currentTaskIntentConstraints]);

  const updateTaskDraftFields = useCallback(
    (patch: Partial<TaskDraft>) => {
      args.setCurrentTaskDraft((prev) => ({
        ...prev,
        ...patch,
        updatedAt: new Date().toISOString(),
      }));
    },
    [args.setCurrentTaskDraft]
  );

  const applyPrefixedTaskFieldsFromText = useCallback(
    (text: string) => {
      const parsed = parseTaskInput(text);

      if (parsed.title || parsed.userInstruction) {
        args.setCurrentTaskDraft((prev) => ({
          ...prev,
          title: parsed.title || prev.title,
          taskName: parsed.title?.trim() ? parsed.title.trim() : prev.taskName,
          userInstruction: parsed.userInstruction || prev.userInstruction,
          updatedAt: new Date().toISOString(),
        }));
      }

      return parsed;
    },
    [args.setCurrentTaskDraft]
  );

  const getTaskSlotLabel = useCallback(
    () => formatTaskSlot(args.currentTaskDraft.slot),
    [args.currentTaskDraft.slot]
  );

  const getResolvedTaskTitle = useCallback(
    (params: {
      explicitTitle?: string;
      freeText?: string;
      searchQuery?: string;
      fallback?: string;
    }) =>
      resolveDraftTitle(args.currentTaskDraft, {
        explicitTitle: params.explicitTitle,
        freeText: params.freeText,
        searchQuery: params.searchQuery,
        fallback: params.fallback,
      }),
    [args.currentTaskDraft]
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
    if (args.currentTaskDraft.body.trim()) return args.currentTaskDraft.body.trim();
    if (args.currentTaskDraft.mergedText.trim()) return args.currentTaskDraft.mergedText.trim();
    if (args.currentTaskDraft.deepenText.trim()) return args.currentTaskDraft.deepenText.trim();
    if (args.currentTaskDraft.prepText.trim()) return args.currentTaskDraft.prepText.trim();

    const last = [...args.gptMessages].reverse().find((m) => m.role === "gpt");
    return last?.text?.trim() || "";
  }, [args.currentTaskDraft, args.gptMessages]);

  const syncTaskDraftFromProtocol = useCallback(
    (params: {
      taskId: string;
      title: string;
      goal: string;
      compiledTaskPrompt: string;
    }) => {
      args.setCurrentTaskDraft((prev) => ({
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
    [args.setCurrentTaskDraft]
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
