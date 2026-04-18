import { generateId } from "@/lib/uuid";
import {
  buildTaskInput,
  formatTaskResultText,
  runAutoDeepenTask,
} from "@/lib/app/gptTaskClient";
import { buildDeepenedTaskDraftUpdate } from "@/lib/app/taskDraftFlowProjection";
import {
  appendTaskInfoMessage,
  buildTaskFlowRecentContext,
  completeTaskFlowSuccess,
  startTaskFlowRequest,
} from "@/lib/app/taskDraftFlowShared";
import type { DeepenTaskFromLastFlowArgs } from "@/lib/app/taskDraftActionFlowTypes";
import type { Message } from "@/types/chat";

export async function runDeepenTaskFromLastFlow(
  args: DeepenTaskFromLastFlowArgs
) {
  if (args.gptLoading) return;

  const text = args.getTaskBaseText();
  if (!text) {
    appendTaskInfoMessage(
      args.setGptMessages,
      "No task content was found to deepen."
    );
    return;
  }

  const parsedInput = args.applyPrefixedTaskFieldsFromText(args.gptInput.trim());
  const resolvedTitle = args.getResolvedTaskTitle({
    explicitTitle: parsedInput.title,
    freeText: parsedInput.freeText || args.gptInput.trim(),
    searchQuery: parsedInput.searchQuery,
    fallback: args.currentTaskDraft.title || "Deepened task",
  });

  const taskInput = buildTaskInput({
    title: resolvedTitle,
    userInstruction:
      parsedInput.userInstruction || args.currentTaskDraft.userInstruction,
    actionInstruction: parsedInput.freeText || args.gptInput.trim(),
    body: text,
    material: text,
  });

  const userMsg: Message = {
    id: generateId(),
    role: "user",
    text: `[Deepen]\n${parsedInput.freeText || "Deeper analysis requested."}`,
    meta: {
      kind: "task_info",
    },
  };

  const { requestRecentMessages } = buildTaskFlowRecentContext({
    gptStateRef: args.gptStateRef,
    chatRecentLimit: args.chatRecentLimit,
    userMessage: userMsg,
  });

  startTaskFlowRequest({
    setGptMessages: args.setGptMessages,
    setGptInput: args.setGptInput,
    setGptLoading: args.setGptLoading,
    userMessage: userMsg,
  });

  try {
    const data = await runAutoDeepenTask(taskInput, "current-task");
    const taskText = formatTaskResultText(data?.parsed, data?.raw);
    const assistantMsg: Message = {
      id: generateId(),
      role: "gpt",
      text: taskText,
      meta: {
        kind: "task_deepen",
      },
    };

    await completeTaskFlowSuccess({
      setGptMessages: args.setGptMessages,
      assistantMessage: assistantMsg,
      setGptState: args.setGptState,
      persistCurrentGptState: args.persistCurrentGptState,
      gptStateRef: args.gptStateRef,
      requestRecentMessages,
      chatRecentLimit: args.chatRecentLimit,
      lastUserIntent: `繧ｿ繧ｹ繧ｯ豺ｱ謗倥ｊ: ${resolvedTitle}`,
      applySummaryUsage: args.applySummaryUsage,
      handleGptMemory: args.handleGptMemory,
      currentTaskTitleOverride: resolvedTitle,
    });

    args.setCurrentTaskDraft((prev) =>
      buildDeepenedTaskDraftUpdate(prev, {
        title: resolvedTitle,
        userInstruction: parsedInput.userInstruction,
        body: taskText,
      })
    );

    args.applyTaskUsage(data?.usage);
  } catch (error) {
    console.error(error);
    appendTaskInfoMessage(args.setGptMessages, "Deepening the task failed.");
  } finally {
    args.setGptLoading(false);
  }
}
