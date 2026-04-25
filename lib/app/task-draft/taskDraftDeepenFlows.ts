import { generateId } from "@/lib/uuid";
import {
  buildTaskInput,
  formatTaskResultText,
  runAutoDeepenTask,
} from "@/lib/app/gptTaskClient";
import { buildDeepenedTaskDraftUpdate } from "@/lib/app/task-draft/taskDraftFlowProjection";
import {
  appendTaskInfoMessage,
  buildTaskFlowRecentContext,
  completeTaskFlowSuccess,
  formatTaskFlowErrorMessage,
  startTaskFlowRequest,
} from "@/lib/app/task-draft/taskDraftFlowShared";
import type { DeepenTaskFromLastFlowArgs } from "@/lib/app/task-draft/taskDraftActionFlowTypes";
import type { Message } from "@/types/chat";
import {
  mergeTaskTitleInstructions,
  resolveGeneratedTaskTitle,
  resolveTaskDraftUserInstruction,
} from "@/lib/taskTitleGeneration";

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
  const fallbackTitle = args.getResolvedTaskTitle({
    explicitTitle: parsedInput.title,
    freeText: parsedInput.freeText || args.gptInput.trim(),
    searchQuery: parsedInput.searchQuery,
    fallback: args.currentTaskDraft.title || "Deepened task",
  });
  const resolvedTitleResult = await resolveGeneratedTaskTitle({
    explicitTitle: parsedInput.title,
    currentTitle: args.currentTaskDraft.title || args.currentTaskDraft.taskName,
    taskBody: text,
    additionalSource: "",
    userInstruction: mergeTaskTitleInstructions(
      parsedInput.freeText,
      parsedInput.userInstruction,
      args.currentTaskDraft.userInstruction
    ),
    fallbackTitle,
    includeCurrentTitle: false,
  });
  const resolvedTitle = resolvedTitleResult.title || fallbackTitle;
  const nextUserInstruction = resolveTaskDraftUserInstruction(
    parsedInput.userInstruction,
    parsedInput.freeText,
    args.currentTaskDraft.userInstruction
  );

  const taskInput = buildTaskInput({
    title: resolvedTitle,
    userInstruction: nextUserInstruction,
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
      lastUserIntent: `郢ｧ・ｿ郢ｧ・ｹ郢ｧ・ｯ雎ｺ・ｱ隰怜･・・ ${resolvedTitle}`,
      applyChatUsage: args.applyChatUsage,
      applyCompressionUsage: args.applyCompressionUsage,
      handleGptMemory: args.handleGptMemory,
      currentTaskTitleOverride: resolvedTitle,
    });

    args.setCurrentTaskDraft((prev) =>
      buildDeepenedTaskDraftUpdate(prev, {
        title: resolvedTitle,
        userInstruction: nextUserInstruction,
        taskTitleDebug: resolvedTitleResult.debug,
        body: taskText,
      })
    );

    args.applyTaskUsage(resolvedTitleResult.usage, { countRun: false });
    args.applyTaskUsage(data?.usage);
  } catch (error) {
    console.error(error);
    appendTaskInfoMessage(
      args.setGptMessages,
      formatTaskFlowErrorMessage("Deepening the task failed.", error)
    );
  } finally {
    args.setGptLoading(false);
  }
}


