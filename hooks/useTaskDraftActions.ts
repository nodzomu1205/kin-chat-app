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
      setGptState: args.gptMemoryRuntime.setGptState,
      persistCurrentGptState: args.gptMemoryRuntime.persistCurrentGptState,
      setCurrentTaskDraft: args.setCurrentTaskDraft,
      gptStateRef: args.gptMemoryRuntime.gptStateRef,
      chatRecentLimit: args.gptMemoryRuntime.chatRecentLimit,
      applyTaskUsage: args.applyTaskUsage,
      applySummaryUsage: args.applySummaryUsage,
      handleGptMemory: args.gptMemoryRuntime.handleGptMemory,
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
      setGptState: args.gptMemoryRuntime.setGptState,
      persistCurrentGptState: args.gptMemoryRuntime.persistCurrentGptState,
      setCurrentTaskDraft: args.setCurrentTaskDraft,
      gptStateRef: args.gptMemoryRuntime.gptStateRef,
      chatRecentLimit: args.gptMemoryRuntime.chatRecentLimit,
      applyTaskUsage: args.applyTaskUsage,
      applySummaryUsage: args.applySummaryUsage,
      handleGptMemory: args.gptMemoryRuntime.handleGptMemory,
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
      setGptState: args.gptMemoryRuntime.setGptState,
      persistCurrentGptState: args.gptMemoryRuntime.persistCurrentGptState,
      setCurrentTaskDraft: args.setCurrentTaskDraft,
      gptStateRef: args.gptMemoryRuntime.gptStateRef,
      chatRecentLimit: args.gptMemoryRuntime.chatRecentLimit,
      applyTaskUsage: args.applyTaskUsage,
      applySummaryUsage: args.applySummaryUsage,
      handleGptMemory: args.gptMemoryRuntime.handleGptMemory,
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
      setGptState: args.gptMemoryRuntime.setGptState,
      persistCurrentGptState: args.gptMemoryRuntime.persistCurrentGptState,
      setCurrentTaskDraft: args.setCurrentTaskDraft,
      gptStateRef: args.gptMemoryRuntime.gptStateRef,
      chatRecentLimit: args.gptMemoryRuntime.chatRecentLimit,
      applyTaskUsage: args.applyTaskUsage,
      applySummaryUsage: args.applySummaryUsage,
      handleGptMemory: args.gptMemoryRuntime.handleGptMemory,
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
      setGptState: args.gptMemoryRuntime.setGptState,
      persistCurrentGptState: args.gptMemoryRuntime.persistCurrentGptState,
      setCurrentTaskDraft: args.setCurrentTaskDraft,
      gptStateRef: args.gptMemoryRuntime.gptStateRef,
      chatRecentLimit: args.gptMemoryRuntime.chatRecentLimit,
      applyTaskUsage: args.applyTaskUsage,
      applySummaryUsage: args.applySummaryUsage,
      handleGptMemory: args.gptMemoryRuntime.handleGptMemory,
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
