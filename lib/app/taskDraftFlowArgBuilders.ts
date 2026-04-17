import type { SearchContext } from "@/types/task";
import type { UseTaskDraftActionsArgs } from "@/hooks/chatPageActionTypes";
import type {
  AttachSearchResultToTaskFlowArgs,
  CommonTaskDraftFlowArgs,
  DeepenTaskFromLastFlowArgs,
  PrepTaskFromInputFlowArgs,
  UpdateTaskFromInputFlowArgs,
  UpdateTaskFromLastGptMessageFlowArgs,
} from "@/lib/app/taskDraftActionFlows";

export function buildTaskDraftSearchContextResolver(
  args: Pick<UseTaskDraftActionsArgs, "getTaskLibraryItem" | "lastSearchContext">
) {
  return () => {
    const taskLibraryItem = args.getTaskLibraryItem();
    if (taskLibraryItem?.itemType !== "search") return null;
    if (!taskLibraryItem.rawResultId) return null;
    if (args.lastSearchContext?.rawResultId !== taskLibraryItem.rawResultId) {
      return null;
    }
    return args.lastSearchContext;
  };
}

export function buildCommonTaskDraftFlowArgs(
  args: UseTaskDraftActionsArgs,
  getTaskSearchContext: () => SearchContext | null
): CommonTaskDraftFlowArgs {
  return {
    gptLoading: args.gptLoading,
    currentTaskDraft: args.currentTaskDraft,
    getTaskBaseText: args.getTaskBaseText,
    getTaskSearchContext,
    applyPrefixedTaskFieldsFromText: args.applyPrefixedTaskFieldsFromText,
    getResolvedTaskTitle: args.getResolvedTaskTitle,
    setGptMessages: args.setGptMessages,
    setGptInput: args.setGptInput,
    setGptLoading: args.setGptLoading,
    setGptState: args.gptMemoryRuntime.setGptState,
    persistCurrentGptState: args.gptMemoryRuntime.persistCurrentGptState,
    setCurrentTaskDraft: args.setCurrentTaskDraft,
    gptStateRef: args.gptMemoryRuntime.gptStateRef,
    chatRecentLimit: args.gptMemoryRuntime.chatRecentLimit,
    applyTaskUsage: args.applyTaskUsage,
    applySummaryUsage: args.applySummaryUsage,
    handleGptMemory: args.gptMemoryRuntime.handleGptMemory,
  };
}

export function buildPrepTaskFromInputFlowArgs(
  args: UseTaskDraftActionsArgs,
  getTaskSearchContext: () => SearchContext | null
): PrepTaskFromInputFlowArgs {
  return {
    ...buildCommonTaskDraftFlowArgs(args, getTaskSearchContext),
    gptInput: args.gptInput,
  };
}

export function buildUpdateTaskFromInputFlowArgs(
  args: UseTaskDraftActionsArgs,
  getTaskSearchContext: () => SearchContext | null
): UpdateTaskFromInputFlowArgs {
  return {
    ...buildCommonTaskDraftFlowArgs(args, getTaskSearchContext),
    gptInput: args.gptInput,
  };
}

export function buildUpdateTaskFromLastGptMessageFlowArgs(
  args: UseTaskDraftActionsArgs,
  getTaskSearchContext: () => SearchContext | null
): UpdateTaskFromLastGptMessageFlowArgs {
  return {
    ...buildCommonTaskDraftFlowArgs(args, getTaskSearchContext),
    gptInput: args.gptInput,
    gptMessages: args.gptMessages,
  };
}

export function buildAttachSearchResultToTaskFlowArgs(
  args: UseTaskDraftActionsArgs,
  getTaskSearchContext: () => SearchContext | null
): AttachSearchResultToTaskFlowArgs {
  return {
    ...buildCommonTaskDraftFlowArgs(args, getTaskSearchContext),
    gptInput: args.gptInput,
    lastSearchContext: args.lastSearchContext,
    getTaskLibraryItem: args.getTaskLibraryItem,
  };
}

export function buildDeepenTaskFromLastFlowArgs(
  args: UseTaskDraftActionsArgs,
  getTaskSearchContext: () => SearchContext | null
): DeepenTaskFromLastFlowArgs {
  return {
    ...buildCommonTaskDraftFlowArgs(args, getTaskSearchContext),
    gptInput: args.gptInput,
  };
}
