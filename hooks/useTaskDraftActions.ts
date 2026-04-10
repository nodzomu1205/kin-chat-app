import {
  runAttachSearchResultToTaskFlow,
  runDeepenTaskFromLastFlow,
  runPrepTaskFromInputFlow,
  runUpdateTaskFromInputFlow,
  runUpdateTaskFromLastGptMessageFlow,
} from "@/lib/app/taskDraftActionFlows";
import type { UseChatPageActionsArgs } from "@/hooks/useChatPageActions";

export function useTaskDraftActions(args: UseChatPageActionsArgs) {
  const getDraftSearchContext = () => {
    const taskLibraryItem = args.getTaskLibraryItem();
    if (taskLibraryItem?.itemType !== "search") return null;
    if (!taskLibraryItem.rawResultId) return null;
    if (args.lastSearchContext?.rawResultId !== taskLibraryItem.rawResultId) {
      return null;
    }
    return args.lastSearchContext;
  };

  const runPrepTaskFromInput = async () => {
    await runPrepTaskFromInputFlow({
      gptInput: args.gptInput,
      gptLoading: args.gptLoading,
      currentTaskDraft: args.currentTaskDraft,
      getTaskBaseText: args.getTaskBaseText,
      getTaskSearchContext: getDraftSearchContext,
      applyPrefixedTaskFieldsFromText: args.applyPrefixedTaskFieldsFromText,
      getResolvedTaskTitle: args.getResolvedTaskTitle,
      setGptMessages: args.setGptMessages,
      setGptInput: args.setGptInput,
      setGptLoading: args.setGptLoading,
      setGptState: args.setGptState,
      setCurrentTaskDraft: args.setCurrentTaskDraft,
      gptStateRef: args.gptStateRef,
      chatRecentLimit: args.chatRecentLimit,
      applyTaskUsage: args.applyTaskUsage,
    });
  };

  const runUpdateTaskFromInput = async () => {
    await runUpdateTaskFromInputFlow({
      gptInput: args.gptInput,
      gptLoading: args.gptLoading,
      currentTaskDraft: args.currentTaskDraft,
      getTaskBaseText: args.getTaskBaseText,
      getTaskSearchContext: getDraftSearchContext,
      applyPrefixedTaskFieldsFromText: args.applyPrefixedTaskFieldsFromText,
      getResolvedTaskTitle: args.getResolvedTaskTitle,
      setGptMessages: args.setGptMessages,
      setGptInput: args.setGptInput,
      setGptLoading: args.setGptLoading,
      setGptState: args.setGptState,
      setCurrentTaskDraft: args.setCurrentTaskDraft,
      gptStateRef: args.gptStateRef,
      chatRecentLimit: args.chatRecentLimit,
      applyTaskUsage: args.applyTaskUsage,
    });
  };

  const runUpdateTaskFromLastGptMessage = async () => {
    await runUpdateTaskFromLastGptMessageFlow({
      gptInput: args.gptInput,
      gptLoading: args.gptLoading,
      gptMessages: args.gptMessages,
      currentTaskDraft: args.currentTaskDraft,
      getTaskBaseText: args.getTaskBaseText,
      getTaskSearchContext: getDraftSearchContext,
      applyPrefixedTaskFieldsFromText: args.applyPrefixedTaskFieldsFromText,
      getResolvedTaskTitle: args.getResolvedTaskTitle,
      setGptMessages: args.setGptMessages,
      setGptInput: args.setGptInput,
      setGptLoading: args.setGptLoading,
      setGptState: args.setGptState,
      setCurrentTaskDraft: args.setCurrentTaskDraft,
      gptStateRef: args.gptStateRef,
      chatRecentLimit: args.chatRecentLimit,
      applyTaskUsage: args.applyTaskUsage,
    });
  };

  const runAttachSearchResultToTask = async () => {
    await runAttachSearchResultToTaskFlow({
      gptInput: args.gptInput,
      gptLoading: args.gptLoading,
      currentTaskDraft: args.currentTaskDraft,
      lastSearchContext: args.lastSearchContext,
      getTaskLibraryItem: args.getTaskLibraryItem,
      getTaskBaseText: args.getTaskBaseText,
      getTaskSearchContext: getDraftSearchContext,
      applyPrefixedTaskFieldsFromText: args.applyPrefixedTaskFieldsFromText,
      getResolvedTaskTitle: args.getResolvedTaskTitle,
      setGptMessages: args.setGptMessages,
      setGptInput: args.setGptInput,
      setGptLoading: args.setGptLoading,
      setGptState: args.setGptState,
      setCurrentTaskDraft: args.setCurrentTaskDraft,
      gptStateRef: args.gptStateRef,
      chatRecentLimit: args.chatRecentLimit,
      applyTaskUsage: args.applyTaskUsage,
    });
  };

  const runDeepenTaskFromLast = async () => {
    await runDeepenTaskFromLastFlow({
      gptInput: args.gptInput,
      gptLoading: args.gptLoading,
      currentTaskDraft: args.currentTaskDraft,
      getTaskBaseText: args.getTaskBaseText,
      getTaskSearchContext: getDraftSearchContext,
      applyPrefixedTaskFieldsFromText: args.applyPrefixedTaskFieldsFromText,
      getResolvedTaskTitle: args.getResolvedTaskTitle,
      setGptMessages: args.setGptMessages,
      setGptInput: args.setGptInput,
      setGptLoading: args.setGptLoading,
      setGptState: args.setGptState,
      setCurrentTaskDraft: args.setCurrentTaskDraft,
      gptStateRef: args.gptStateRef,
      chatRecentLimit: args.chatRecentLimit,
      applyTaskUsage: args.applyTaskUsage,
    });
  };

  return {
    runPrepTaskFromInput,
    runUpdateTaskFromInput,
    runUpdateTaskFromLastGptMessage,
    runAttachSearchResultToTask,
    runDeepenTaskFromLast,
  };
}
