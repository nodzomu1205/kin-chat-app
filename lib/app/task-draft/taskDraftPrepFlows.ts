import { generateId } from "@/lib/shared/uuid";
import {
  buildMergedTaskInput,
  buildTaskInput,
  buildTaskStructuredInput,
  formatTaskResultText,
  runAutoPrepTask,
  runAutoPrepPresentationTask,
  runAutoUpdatePresentationTask,
} from "@/lib/app/gpt-task/gptTaskClient";
import {
  buildPresentationTaskPlan,
  buildPresentationTaskStructuredInput,
  formatPresentationTaskPlanText,
  formatPresentationTaskResultText,
  isPresentationTaskInstruction,
  resolvePresentationTaskTitle,
  stripPresentationTaskMarker,
} from "@/lib/app/presentation/presentationTaskPlanning";
import {
  buildPresentationImageLibraryContext,
  getPresentationImageLibraryCandidates,
} from "@/lib/app/presentation/presentationImageLibrary";
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
import {
  buildLatestGptTaskUpdateIntent,
  buildTaskFormationIntent,
  buildTaskUpdateIntent,
} from "@/lib/app/task-draft/taskDraftIntentText";
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

function buildTaskDraftImageLibraryContext(
  args:
    | PrepTaskFromInputFlowArgs
    | UpdateTaskFromInputFlowArgs
    | UpdateTaskFromLastGptMessageFlowArgs
) {
  return buildPresentationImageLibraryContext(
    getPresentationImageLibraryCandidates({
      enabled: args.imageLibraryReferenceEnabled,
      count: args.imageLibraryReferenceCount,
      referenceLibraryItems: args.referenceLibraryItems,
    })
  );
}

export async function runPrepTaskFromInputFlow(
  args: PrepTaskFromInputFlowArgs
) {
  if (!args.gptInput.trim() || args.gptLoading) return;

  const text = args.gptInput.trim();
  const presentationMode =
    args.currentTaskDraft.mode === "presentation" ||
    isPresentationTaskInstruction(text);
  const normalizedText = presentationMode
    ? stripPresentationTaskMarker(text)
    : text;
  const parsedInput = args.applyPrefixedTaskFieldsFromText(normalizedText);
  const taskBodySource = parsedInput.freeText || normalizedText;
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
  const resolvedTitle = resolvePresentationTaskTitle({
    presentationMode,
    explicitTitle: parsedInput.title,
    currentTitle: args.currentTaskDraft.title,
    currentTaskName: args.currentTaskDraft.taskName,
    generatedTitle: resolvedTitleResult.title,
    fallbackTitle,
    preserveExistingTitle: false,
  });
  const nextUserInstruction = resolveTaskDraftUserInstruction(
    parsedInput.userInstruction,
    args.currentTaskDraft.userInstruction
  );
  const prepInput = presentationMode
    ? buildPresentationTaskStructuredInput({
        title: resolvedTitle,
        userInstruction: nextUserInstruction,
        body: taskBodySource,
        material: args.currentTaskDraft.searchContext?.rawText || "",
        imageLibraryContext: buildTaskDraftImageLibraryContext(args),
      })
    : buildTaskStructuredInput({
        title: resolvedTitle,
        userInstruction: nextUserInstruction,
        body: taskBodySource,
        searchRawText: args.currentTaskDraft.searchContext?.rawText || "",
      });

  const userMsg: Message = {
    id: generateId(),
    role: "user",
    text: presentationMode ? `[PPT design prep]\n${text}` : `[Task prep]\n${text}`,
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
    const data = presentationMode
      ? await runAutoPrepPresentationTask(prepInput, "gpt-input-ppt")
      : await runAutoPrepTask(prepInput, "gpt-input");
    const presentationPlan = presentationMode
      ? buildPresentationTaskPlan({
          title: resolvedTitle,
          result: data?.parsed,
          rawText: data?.raw,
        })
      : null;
    const taskText = presentationMode
      ? presentationPlan
        ? formatPresentationTaskPlanText(presentationPlan)
        : formatPresentationTaskResultText(data?.parsed, data?.raw)
      : formatTaskResultText(data?.parsed, data?.raw);
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
      lastUserIntent: buildTaskFormationIntent(resolvedTitle),
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
        mode: presentationMode ? "presentation" : "normal",
        presentationPlan,
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
  const presentationMode =
    args.currentTaskDraft.mode === "presentation" ||
    isPresentationTaskInstruction(additionalText);
  const normalizedAdditionalText = presentationMode
    ? stripPresentationTaskMarker(additionalText)
    : additionalText;
  const parsedInput =
    args.applyPrefixedTaskFieldsFromText(normalizedAdditionalText);
  const fallbackTitle = resolveUpdateTaskTitle({
    explicitTitle: parsedInput.title,
    currentTitle: args.currentTaskDraft.title,
    currentTaskName: args.currentTaskDraft.taskName,
    freeText: parsedInput.freeText || normalizedAdditionalText,
    searchQuery: parsedInput.searchQuery,
    fallback: args.currentTaskDraft.title || "Task",
    getResolvedTaskTitle: args.getResolvedTaskTitle,
  });
  const resolvedTitleResult = await resolveGeneratedTaskTitle({
    explicitTitle: parsedInput.title,
    currentTitle: args.currentTaskDraft.title || args.currentTaskDraft.taskName,
    taskBody: currentTaskText,
    additionalSource: parsedInput.freeText || normalizedAdditionalText,
    userInstruction: mergeTaskTitleInstructions(
      parsedInput.userInstruction,
      args.currentTaskDraft.userInstruction
    ),
    fallbackTitle,
  });
  const resolvedTitle = resolvePresentationTaskTitle({
    presentationMode,
    explicitTitle: parsedInput.title,
    currentTitle: args.currentTaskDraft.title,
    currentTaskName: args.currentTaskDraft.taskName,
    generatedTitle: resolvedTitleResult.title,
    fallbackTitle,
    preserveExistingTitle: true,
  });
  const nextUserInstruction = resolveTaskDraftUserInstruction(
    parsedInput.userInstruction,
    args.currentTaskDraft.userInstruction
  );

  const mergedInput = presentationMode
    ? buildPresentationTaskStructuredInput({
        title: resolvedTitle,
        userInstruction: nextUserInstruction,
        currentPlanText: currentTaskText,
        body: parsedInput.freeText || normalizedAdditionalText,
        material: args.currentTaskDraft.searchContext?.rawText || "",
        imageLibraryContext: buildTaskDraftImageLibraryContext(args),
      })
    : buildMergedTaskInput(
        currentTaskText,
        "GPT task update",
        parsedInput.freeText || normalizedAdditionalText,
        {
          title: resolvedTitle,
          userInstruction: nextUserInstruction,
          searchRawText: args.currentTaskDraft.searchContext?.rawText || "",
        }
      );

  const userMsg: Message = {
    id: generateId(),
    role: "user",
    text: presentationMode
      ? `[PPT design update]\n${additionalText}`
      : `[Task update]\n${additionalText}`,
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
    const data = presentationMode
      ? await runAutoUpdatePresentationTask(mergedInput, "task-update-ppt")
      : await runAutoPrepTask(mergedInput, "task-update");
    const presentationPlan = presentationMode
      ? buildPresentationTaskPlan({
          title: resolvedTitle,
          result: data?.parsed,
          rawText: data?.raw,
        })
      : undefined;
    const taskText = presentationMode
      ? presentationPlan
        ? formatPresentationTaskPlanText(presentationPlan)
        : formatPresentationTaskResultText(data?.parsed, data?.raw)
      : formatTaskResultText(data?.parsed, data?.raw);
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
      lastUserIntent: buildTaskUpdateIntent(resolvedTitle),
      applyChatUsage: args.applyChatUsage,
      applyCompressionUsage: args.applyCompressionUsage,
      handleGptMemory: args.handleGptMemory,
      currentTaskTitleOverride: resolvedTitle,
    });

    const source = buildGptTaskUpdateSource(
      parsedInput.freeText || normalizedAdditionalText
    );

    args.setCurrentTaskDraft((prev) =>
      buildPreparedTaskDraftUpdate(prev, {
        title: resolvedTitle,
        userInstruction: nextUserInstruction,
        taskTitleDebug: resolvedTitleResult.debug,
        mode: presentationMode ? "presentation" : prev.mode,
        presentationPlan,
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

  const presentationMode =
    args.currentTaskDraft.mode === "presentation" ||
    isPresentationTaskInstruction(args.gptInput.trim());
  const normalizedInput = presentationMode
    ? stripPresentationTaskMarker(args.gptInput.trim())
    : args.gptInput.trim();
  const parsedInput = args.applyPrefixedTaskFieldsFromText(normalizedInput);
  const directionInstruction = parsedInput.freeText || normalizedInput;
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
  const resolvedTitle = resolvePresentationTaskTitle({
    presentationMode,
    explicitTitle: parsedInput.title,
    currentTitle: args.currentTaskDraft.title,
    currentTaskName: args.currentTaskDraft.taskName,
    generatedTitle: resolvedTitleResult.title,
    fallbackTitle,
    preserveExistingTitle: true,
  });
  const nextUserInstruction = resolveTaskDraftUserInstruction(
    parsedInput.userInstruction,
    directionInstruction,
    args.currentTaskDraft.userInstruction
  );
  const taskInput = presentationMode
    ? buildPresentationTaskStructuredInput({
        title: resolvedTitle,
        userInstruction:
          nextUserInstruction ||
          "最新GPTメッセージを素材としてPPT設計書を更新してください。",
        currentPlanText: currentTaskText,
        body: directionInstruction,
        material: lastGptMessage.text.trim(),
        imageLibraryContext: buildTaskDraftImageLibraryContext(args),
      })
    : currentTaskText
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
    const data = presentationMode
      ? await runAutoUpdatePresentationTask(taskInput, "task-update-last-gpt-ppt")
      : await runAutoPrepTask(taskInput, "task-update-last-gpt");
    const presentationPlan = presentationMode
      ? buildPresentationTaskPlan({
          title: resolvedTitle,
          result: data?.parsed,
          rawText: data?.raw,
        })
      : undefined;
    const taskText = presentationMode
      ? presentationPlan
        ? formatPresentationTaskPlanText(presentationPlan)
        : formatPresentationTaskResultText(data?.parsed, data?.raw)
      : formatTaskResultText(data?.parsed, data?.raw);
    const assistantMsg: Message = {
      id: generateId(),
      role: "gpt",
      text: [
        presentationMode
          ? "PPT design task updated from latest GPT message."
          : "Task updated from latest GPT message.",
        taskText,
      ].join("\n\n"),
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
      lastUserIntent: buildLatestGptTaskUpdateIntent(resolvedTitle),
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
        mode: presentationMode ? "presentation" : prev.mode,
        presentationPlan,
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


