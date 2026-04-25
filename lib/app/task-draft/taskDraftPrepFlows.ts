import { generateId } from "@/lib/shared/uuid";
import {
  buildMergedTaskInput,
  buildTaskInput,
  buildTaskStructuredInput,
  formatTaskResultText,
  runAutoPrepTask,
} from "@/lib/app/gpt-task/gptTaskClient";
import { buildPreparedTaskDraftUpdate } from "@/lib/app/task-draft/taskDraftFlowProjection";
import {
  buildGptTaskPrepSource,
  buildGptTaskUpdateSource,
  buildLatestGptTaskSource,
  resolveUpdateTaskTitle,
} from "@/lib/app/task-draft/taskDraftFlowResolvers";
import {
  appendTaskInfoMessage,
  buildTaskFlowRecentContext,
  completeTaskFlowSuccess,
  formatTaskFlowErrorMessage,
  startTaskFlowRequest,
} from "@/lib/app/task-draft/taskDraftFlowShared";
import { findLatestTransferableGptMessage } from "@/lib/app/task-support/latestGptMessage";
import {
  mergeTaskTitleInstructions,
  resolveGeneratedTaskTitle,
  resolveTaskDraftUserInstruction,
} from "@/lib/task/taskTitleGeneration";
import type {
  PrepTaskFromInputFlowArgs,
  UpdateTaskFromInputFlowArgs,
  UpdateTaskFromLastGptMessageFlowArgs,
} from "@/lib/app/task-draft/taskDraftActionFlowTypes";
import type { Message } from "@/types/chat";

export async function runPrepTaskFromInputFlow(
  args: PrepTaskFromInputFlowArgs
) {
  if (!args.gptInput.trim() || args.gptLoading) return;

  const text = args.gptInput.trim();
  const parsedInput = args.applyPrefixedTaskFieldsFromText(text);
  const taskBodySource = parsedInput.freeText || text;
  const fallbackTitle = args.getResolvedTaskTitle({
    explicitTitle: parsedInput.title,
    freeText: taskBodySource,
    searchQuery: parsedInput.searchQuery,
    fallback: "Prepared task",
  });
  const resolvedTitleResult = await resolveGeneratedTaskTitle({
    explicitTitle: parsedInput.title,
    currentTitle: args.currentTaskDraft.title || args.currentTaskDraft.taskName,
    taskBody: args.currentTaskDraft.body,
    additionalSource: taskBodySource,
    userInstruction: mergeTaskTitleInstructions(
      parsedInput.userInstruction,
      args.currentTaskDraft.userInstruction
    ),
    fallbackTitle,
    includeCurrentTitle: false,
  });
  const resolvedTitle = resolvedTitleResult.title || fallbackTitle;
  const nextUserInstruction = resolveTaskDraftUserInstruction(
    parsedInput.userInstruction,
    args.currentTaskDraft.userInstruction
  );
  const prepInput = buildTaskStructuredInput({
    title: resolvedTitle,
    userInstruction: nextUserInstruction,
    body: taskBodySource,
    searchRawText: args.currentTaskDraft.searchContext?.rawText || "",
  });

  const userMsg: Message = {
    id: generateId(),
    role: "user",
    text: `[Task prep]\n${text}`,
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
    const data = await runAutoPrepTask(prepInput, "gpt-input");
    const taskText = formatTaskResultText(data?.parsed, data?.raw);
    const assistantMsg: Message = {
      id: generateId(),
      role: "gpt",
      text: taskText,
      meta: {
        kind: "task_prep",
        sourceType: "gpt_input",
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
      lastUserIntent: `郢ｧ・ｿ郢ｧ・ｹ郢ｧ・ｯ隰ｨ・ｴ騾・・ ${resolvedTitle}`,
      applyChatUsage: args.applyChatUsage,
      applyCompressionUsage: args.applyCompressionUsage,
      handleGptMemory: args.handleGptMemory,
      currentTaskTitleOverride: resolvedTitle,
    });

    const source = buildGptTaskPrepSource(text);
    args.setCurrentTaskDraft((prev) =>
      buildPreparedTaskDraftUpdate(prev, {
        title: resolvedTitle,
        userInstruction: nextUserInstruction,
        taskTitleDebug: resolvedTitleResult.debug,
        body: taskText,
        searchContext: args.currentTaskDraft.searchContext ?? prev.searchContext,
        objective: (parsedInput.freeText || text).slice(0, 120),
        prepText: taskText,
        sources: [source],
      })
    );

    args.applyTaskUsage(resolvedTitleResult.usage, { countRun: false });
    args.applyTaskUsage(data?.usage);
  } catch (error) {
    console.error(error);
    appendTaskInfoMessage(
      args.setGptMessages,
      formatTaskFlowErrorMessage("Task preparation failed.", error)
    );
  } finally {
    args.setGptLoading(false);
  }
}

export async function runUpdateTaskFromInputFlow(
  args: UpdateTaskFromInputFlowArgs
) {
  if (!args.gptInput.trim() || args.gptLoading) return;

  const currentTaskText = args.getTaskBaseText();
  if (!currentTaskText) {
    appendTaskInfoMessage(
      args.setGptMessages,
      "No current task content was found to update."
    );
    return;
  }

  const additionalText = args.gptInput.trim();
  const parsedInput = args.applyPrefixedTaskFieldsFromText(additionalText);
  const fallbackTitle = resolveUpdateTaskTitle({
    explicitTitle: parsedInput.title,
    currentTitle: args.currentTaskDraft.title,
    currentTaskName: args.currentTaskDraft.taskName,
    freeText: parsedInput.freeText || additionalText,
    searchQuery: parsedInput.searchQuery,
    fallback: args.currentTaskDraft.title || "Task",
    getResolvedTaskTitle: args.getResolvedTaskTitle,
  });
  const resolvedTitleResult = await resolveGeneratedTaskTitle({
    explicitTitle: parsedInput.title,
    currentTitle: args.currentTaskDraft.title || args.currentTaskDraft.taskName,
    taskBody: currentTaskText,
    additionalSource: parsedInput.freeText || additionalText,
    userInstruction: mergeTaskTitleInstructions(
      parsedInput.userInstruction,
      args.currentTaskDraft.userInstruction
    ),
    fallbackTitle,
  });
  const resolvedTitle = resolvedTitleResult.title || fallbackTitle;
  const nextUserInstruction = resolveTaskDraftUserInstruction(
    parsedInput.userInstruction,
    args.currentTaskDraft.userInstruction
  );

  const mergedInput = buildMergedTaskInput(
    currentTaskText,
    "GPT task update",
    parsedInput.freeText || additionalText,
    {
      title: resolvedTitle,
      userInstruction: nextUserInstruction,
      searchRawText: args.currentTaskDraft.searchContext?.rawText || "",
    }
  );

  const userMsg: Message = {
    id: generateId(),
    role: "user",
    text: `[Task update]\n${additionalText}`,
    meta: {
      kind: "task_info",
      sourceType: "manual",
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
    const data = await runAutoPrepTask(mergedInput, "task-update");
    const taskText = formatTaskResultText(data?.parsed, data?.raw);
    const assistantMsg: Message = {
      id: generateId(),
      role: "gpt",
      text: taskText,
      meta: {
        kind: "task_prep",
        sourceType: "manual",
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
      lastUserIntent: `郢ｧ・ｿ郢ｧ・ｹ郢ｧ・ｯ隴厄ｽｴ隴・ｽｰ: ${resolvedTitle}`,
      applyChatUsage: args.applyChatUsage,
      applyCompressionUsage: args.applyCompressionUsage,
      handleGptMemory: args.handleGptMemory,
      currentTaskTitleOverride: resolvedTitle,
    });

    const source = buildGptTaskUpdateSource(
      parsedInput.freeText || additionalText
    );

    args.setCurrentTaskDraft((prev) =>
      buildPreparedTaskDraftUpdate(prev, {
        title: resolvedTitle,
        userInstruction: nextUserInstruction,
        taskTitleDebug: resolvedTitleResult.debug,
        body: taskText,
        preservePrepText: true,
        sources: [source],
      })
    );

    args.applyTaskUsage(resolvedTitleResult.usage, { countRun: false });
    args.applyTaskUsage(data?.usage);
  } catch (error) {
    console.error(error);
    appendTaskInfoMessage(
      args.setGptMessages,
      formatTaskFlowErrorMessage("Task update failed.", error)
    );
  } finally {
    args.setGptLoading(false);
  }
}

export async function runUpdateTaskFromLastGptMessageFlow(
  args: UpdateTaskFromLastGptMessageFlowArgs
) {
  if (args.gptLoading) return;

  const lastGptMessage = findLatestTransferableGptMessage(args.gptMessages);

  if (!lastGptMessage) {
    appendTaskInfoMessage(args.setGptMessages, "No recent GPT message was found.");
    return;
  }

  const parsedInput = args.applyPrefixedTaskFieldsFromText(args.gptInput.trim());
  const directionInstruction = parsedInput.freeText || args.gptInput.trim();
  const currentTaskText = args.getTaskBaseText();
  const fallbackTitle = resolveUpdateTaskTitle({
    explicitTitle: parsedInput.title,
    currentTitle: args.currentTaskDraft.title,
    currentTaskName: args.currentTaskDraft.taskName,
    freeText: directionInstruction || lastGptMessage.text.trim(),
    searchQuery: parsedInput.searchQuery,
    fallback: args.currentTaskDraft.title || "Task",
    getResolvedTaskTitle: args.getResolvedTaskTitle,
  });
  const resolvedTitleResult = await resolveGeneratedTaskTitle({
    explicitTitle: parsedInput.title,
    currentTitle: args.currentTaskDraft.title || args.currentTaskDraft.taskName,
    taskBody: currentTaskText,
    additionalSource: lastGptMessage.text.trim(),
    userInstruction: mergeTaskTitleInstructions(
      parsedInput.userInstruction,
      directionInstruction,
      args.currentTaskDraft.userInstruction
    ),
    fallbackTitle,
  });
  const resolvedTitle = resolvedTitleResult.title || fallbackTitle;
  const nextUserInstruction = resolveTaskDraftUserInstruction(
    parsedInput.userInstruction,
    directionInstruction,
    args.currentTaskDraft.userInstruction
  );
  const taskInput = currentTaskText
    ? buildTaskInput({
        title: resolvedTitle,
        userInstruction: nextUserInstruction,
        actionInstruction:
          directionInstruction ||
          "Review the latest GPT response, refine the task, and return an updated draft.",
        body: currentTaskText,
        material: lastGptMessage.text.trim(),
      })
    : buildTaskStructuredInput({
        title: resolvedTitle,
        userInstruction:
          nextUserInstruction ||
          "Review the latest GPT response and generate a clean task draft from it.",
        body: lastGptMessage.text.trim(),
        searchRawText: args.currentTaskDraft.searchContext?.rawText || "",
      });

  const { requestRecentMessages } = buildTaskFlowRecentContext({
    gptStateRef: args.gptStateRef,
    chatRecentLimit: args.chatRecentLimit,
  });

  startTaskFlowRequest({
    setGptMessages: args.setGptMessages,
    setGptInput: args.setGptInput,
    setGptLoading: args.setGptLoading,
  });

  try {
    const data = await runAutoPrepTask(taskInput, "task-update-last-gpt");
    const taskText = formatTaskResultText(data?.parsed, data?.raw);
    const assistantMsg: Message = {
      id: generateId(),
      role: "gpt",
      text: ["Task updated from latest GPT message.", taskText].join("\n\n"),
      meta: {
        kind: "task_prep",
        sourceType: "gpt_input",
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
      lastUserIntent: `隴崢隴・ｽｰGPT郢晢ｽｬ郢ｧ・ｹ邵ｺ荵晢ｽ臥ｹｧ・ｿ郢ｧ・ｹ郢ｧ・ｯ隴厄ｽｴ隴・ｽｰ: ${resolvedTitle}`,
      applyChatUsage: args.applyChatUsage,
      applyCompressionUsage: args.applyCompressionUsage,
      handleGptMemory: args.handleGptMemory,
      currentTaskTitleOverride: resolvedTitle,
    });

    const source = buildLatestGptTaskSource({
      directionInstruction,
      latestGptText: lastGptMessage.text.trim(),
    });

    args.setCurrentTaskDraft((prev) =>
      buildPreparedTaskDraftUpdate(prev, {
        title: resolvedTitle,
        userInstruction: nextUserInstruction,
        taskTitleDebug: resolvedTitleResult.debug,
        body: taskText,
        objective: (directionInstruction || lastGptMessage.text.trim()).slice(
          0,
          120
        ),
        sources: [source],
      })
    );

    args.applyTaskUsage(resolvedTitleResult.usage, { countRun: false });
    args.applyTaskUsage(data?.usage);
  } catch (error) {
    console.error(error);
    appendTaskInfoMessage(
      args.setGptMessages,
      formatTaskFlowErrorMessage(
        "Updating the task from the latest GPT message failed.",
        error
      )
    );
  } finally {
    args.setGptLoading(false);
  }
}


