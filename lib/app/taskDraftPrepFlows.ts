import { generateId } from "@/lib/uuid";
import {
  buildMergedTaskInput,
  buildTaskInput,
  buildTaskStructuredInput,
  formatTaskResultText,
  runAutoPrepTask,
} from "@/lib/app/gptTaskClient";
import { buildPreparedTaskDraftUpdate } from "@/lib/app/taskDraftFlowProjection";
import {
  buildGptTaskPrepSource,
  buildGptTaskUpdateSource,
  buildLatestGptTaskSource,
  resolveTaskTitleFromResult,
  resolveUpdateTaskTitle,
} from "@/lib/app/taskDraftFlowResolvers";
import {
  appendTaskInfoMessage,
  buildTaskFlowRecentContext,
  completeTaskFlowSuccess,
  startTaskFlowRequest,
} from "@/lib/app/taskDraftFlowShared";
import type {
  PrepTaskFromInputFlowArgs,
  UpdateTaskFromInputFlowArgs,
  UpdateTaskFromLastGptMessageFlowArgs,
} from "@/lib/app/taskDraftActionFlowTypes";
import type { Message } from "@/types/chat";

export async function runPrepTaskFromInputFlow(
  args: PrepTaskFromInputFlowArgs
) {
  if (!args.gptInput.trim() || args.gptLoading) return;

  const text = args.gptInput.trim();
  const parsedInput = args.applyPrefixedTaskFieldsFromText(text);
  const taskBodySource = parsedInput.freeText || text;
  const resolvedTitle = args.getResolvedTaskTitle({
    explicitTitle: parsedInput.title,
    freeText: taskBodySource,
    searchQuery: parsedInput.searchQuery,
    fallback: "Prepared task",
  });
  const prepInput = buildTaskStructuredInput({
    title: resolvedTitle,
    userInstruction:
      parsedInput.userInstruction || args.currentTaskDraft.userInstruction,
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
      lastUserIntent: `繧ｿ繧ｹ繧ｯ謨ｴ逅・ ${resolvedTitle}`,
      applySummaryUsage: args.applySummaryUsage,
      handleGptMemory: args.handleGptMemory,
      currentTaskTitleOverride: resolvedTitle,
    });

    const source = buildGptTaskPrepSource(text);
    args.setCurrentTaskDraft((prev) =>
      buildPreparedTaskDraftUpdate(prev, {
        title: resolvedTitle,
        userInstruction: parsedInput.userInstruction,
        body: taskText,
        searchContext: args.currentTaskDraft.searchContext ?? prev.searchContext,
        objective: (parsedInput.freeText || text).slice(0, 120),
        prepText: taskText,
        sources: [source],
      })
    );

    args.applyTaskUsage(data?.usage);
  } catch (error) {
    console.error(error);
    appendTaskInfoMessage(args.setGptMessages, "Task preparation failed.");
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
  const resolvedTitle = resolveUpdateTaskTitle({
    explicitTitle: parsedInput.title,
    currentTitle: args.currentTaskDraft.title,
    currentTaskName: args.currentTaskDraft.taskName,
    freeText: parsedInput.freeText || additionalText,
    searchQuery: parsedInput.searchQuery,
    fallback: args.currentTaskDraft.title || "Task",
    getResolvedTaskTitle: args.getResolvedTaskTitle,
  });

  const mergedInput = buildMergedTaskInput(
    currentTaskText,
    "GPT task update",
    parsedInput.freeText || additionalText,
    {
      title: resolvedTitle,
      userInstruction:
        parsedInput.userInstruction || args.currentTaskDraft.userInstruction,
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
    const finalizedTitle = resolveTaskTitleFromResult({
      explicitTitle: parsedInput.title,
      currentTitle: args.currentTaskDraft.title,
      currentTaskName: args.currentTaskDraft.taskName,
      resultText: taskText,
      searchQuery: parsedInput.searchQuery,
      fallback: resolvedTitle,
      getResolvedTaskTitle: args.getResolvedTaskTitle,
    });
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
      lastUserIntent: `繧ｿ繧ｹ繧ｯ譖ｴ譁ｰ: ${finalizedTitle}`,
      applySummaryUsage: args.applySummaryUsage,
      handleGptMemory: args.handleGptMemory,
      currentTaskTitleOverride: finalizedTitle,
    });

    const source = buildGptTaskUpdateSource(
      parsedInput.freeText || additionalText
    );

    args.setCurrentTaskDraft((prev) =>
      buildPreparedTaskDraftUpdate(prev, {
        title: finalizedTitle,
        userInstruction: parsedInput.userInstruction,
        body: taskText,
        preservePrepText: true,
        sources: [source],
      })
    );

    args.applyTaskUsage(data?.usage);
  } catch (error) {
    console.error(error);
    appendTaskInfoMessage(args.setGptMessages, "Task update failed.");
  } finally {
    args.setGptLoading(false);
  }
}

export async function runUpdateTaskFromLastGptMessageFlow(
  args: UpdateTaskFromLastGptMessageFlowArgs
) {
  if (args.gptLoading) return;

  const lastGptMessage = [...args.gptMessages]
    .reverse()
    .find((m) => m.role === "gpt" && typeof m.text === "string" && m.text.trim());

  if (!lastGptMessage) {
    appendTaskInfoMessage(args.setGptMessages, "No recent GPT message was found.");
    return;
  }

  const parsedInput = args.applyPrefixedTaskFieldsFromText(args.gptInput.trim());
  const directionInstruction = parsedInput.freeText || args.gptInput.trim();
  const currentTaskText = args.getTaskBaseText();
  const resolvedTitle = resolveUpdateTaskTitle({
    explicitTitle: parsedInput.title,
    currentTitle: args.currentTaskDraft.title,
    currentTaskName: args.currentTaskDraft.taskName,
    freeText: directionInstruction || lastGptMessage.text.trim(),
    searchQuery: parsedInput.searchQuery,
    fallback: args.currentTaskDraft.title || "Task",
    getResolvedTaskTitle: args.getResolvedTaskTitle,
  });
  const taskInput = currentTaskText
    ? buildTaskInput({
        title: resolvedTitle,
        userInstruction:
          parsedInput.userInstruction || args.currentTaskDraft.userInstruction,
        actionInstruction:
          directionInstruction ||
          "Review the latest GPT response, refine the task, and return an updated draft.",
        body: currentTaskText,
        material: lastGptMessage.text.trim(),
      })
    : buildTaskStructuredInput({
        title: resolvedTitle,
        userInstruction:
          parsedInput.userInstruction ||
          directionInstruction ||
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
    const finalizedTitle = resolveTaskTitleFromResult({
      explicitTitle: parsedInput.title,
      currentTitle: args.currentTaskDraft.title,
      currentTaskName: args.currentTaskDraft.taskName,
      resultText: taskText,
      searchQuery: parsedInput.searchQuery,
      fallback: resolvedTitle,
      getResolvedTaskTitle: args.getResolvedTaskTitle,
    });
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
      lastUserIntent: `譛譁ｰGPT繝ｬ繧ｹ縺九ｉ繧ｿ繧ｹ繧ｯ譖ｴ譁ｰ: ${finalizedTitle}`,
      applySummaryUsage: args.applySummaryUsage,
      handleGptMemory: args.handleGptMemory,
      currentTaskTitleOverride: finalizedTitle,
    });

    const source = buildLatestGptTaskSource({
      directionInstruction,
      latestGptText: lastGptMessage.text.trim(),
    });

    args.setCurrentTaskDraft((prev) =>
      buildPreparedTaskDraftUpdate(prev, {
        title: finalizedTitle,
        userInstruction: parsedInput.userInstruction,
        body: taskText,
        objective: (directionInstruction || lastGptMessage.text.trim()).slice(
          0,
          120
        ),
        sources: [source],
      })
    );

    args.applyTaskUsage(data?.usage);
  } catch (error) {
    console.error(error);
    appendTaskInfoMessage(
      args.setGptMessages,
      "Updating the task from the latest GPT message failed."
    );
  } finally {
    args.setGptLoading(false);
  }
}
