import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { generateId } from "@/lib/uuid";
import {
  buildMergedTaskInput,
  buildTaskInput,
  buildTaskStructuredInput,
  formatTaskResultText,
  runAutoDeepenTask,
  runAutoPrepTask,
} from "@/lib/app/gptTaskClient";
import {
  buildDeepenedTaskDraftUpdate,
  buildLibraryTaskSource,
  buildPreparedTaskDraftUpdate,
} from "@/lib/app/taskDraftFlowProjection";
import {
  buildGptTaskPrepSource,
  buildGptTaskUpdateSource,
  buildLatestGptTaskSource,
  resolveTaskTitleFromResult,
  resolveUpdateTaskTitle,
} from "@/lib/app/taskDraftFlowResolvers";
import {
  appendTaskFlowAssistantResult,
  appendTaskFlowRecentMessage,
  appendTaskInfoMessage,
  applyTaskFlowSummaryUsage,
  getTaskFlowRecentMessages,
  startTaskFlowRequest,
} from "@/lib/app/taskDraftFlowShared";
import type { KinMemoryState, Message, ReferenceLibraryItem } from "@/types/chat";
import type { SearchContext, TaskDraft } from "@/types/task";
import { normalizeUsage } from "@/lib/tokenStats";

type ParsedInputLike = {
  title?: string;
  userInstruction?: string;
  freeText?: string;
  searchQuery?: string;
};

type SetTaskDraft = Dispatch<SetStateAction<TaskDraft>>;

export type CommonTaskDraftFlowArgs = {
  gptLoading: boolean;
  currentTaskDraft: TaskDraft;
  getTaskBaseText: () => string;
  getTaskSearchContext: () => SearchContext | null;
  applyPrefixedTaskFieldsFromText: (text: string) => ParsedInputLike;
  getResolvedTaskTitle: (params: {
    explicitTitle?: string;
    freeText?: string;
    searchQuery?: string;
    fallback?: string;
  }) => string;
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
  setGptInput: Dispatch<SetStateAction<string>>;
  setGptLoading: Dispatch<SetStateAction<boolean>>;
  setGptState: Dispatch<SetStateAction<KinMemoryState>>;
  persistCurrentGptState?: (state: KinMemoryState) => void;
  setCurrentTaskDraft: SetTaskDraft;
  gptStateRef: MutableRefObject<KinMemoryState>;
  chatRecentLimit: number;
  applyTaskUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
  applySummaryUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
  handleGptMemory: (
    recent: Message[],
    options?: {
      currentTaskTitleOverride?: string;
      lastUserIntent?: string;
      activeDocument?: Record<string, unknown> | null;
    }
  ) => Promise<{ summaryUsage: Parameters<typeof normalizeUsage>[0] | null }>;
};

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
    userInstruction: parsedInput.userInstruction || args.currentTaskDraft.userInstruction,
    body: taskBodySource,
    searchRawText: args.currentTaskDraft.searchContext?.rawText || "",
  });

  const userMsg: Message = {
    id: generateId(),
    role: "user",
    text: `[Task prep]\n${text}`,
  };

  const baseRecent = getTaskFlowRecentMessages(args.gptStateRef);
  const newRecent = appendTaskFlowRecentMessage(
    baseRecent,
    args.chatRecentLimit,
    userMsg
  );

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
    const updatedRecent = appendTaskFlowRecentMessage(
      newRecent,
      args.chatRecentLimit,
      assistantMsg
    );

    appendTaskFlowAssistantResult({
      setGptMessages: args.setGptMessages,
      assistantMessage: assistantMsg,
      setGptState: args.setGptState,
      persistCurrentGptState: args.persistCurrentGptState,
      gptStateRef: args.gptStateRef,
      recentMessages: updatedRecent,
      lastUserIntent: `タスク整理: ${resolvedTitle}`,
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
    await applyTaskFlowSummaryUsage({
      recentMessages: updatedRecent,
      applySummaryUsage: args.applySummaryUsage,
      handleGptMemory: args.handleGptMemory,
      currentTaskTitleOverride: resolvedTitle,
      lastUserIntent: `タスク整理: ${resolvedTitle}`,
    });
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
    appendTaskInfoMessage(args.setGptMessages, "No current task content was found to update.");
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
      userInstruction: parsedInput.userInstruction || args.currentTaskDraft.userInstruction,
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

  const baseRecent = getTaskFlowRecentMessages(args.gptStateRef);
  const newRecent = appendTaskFlowRecentMessage(
    baseRecent,
    args.chatRecentLimit,
    userMsg
  );

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
    const updatedRecent = appendTaskFlowRecentMessage(
      newRecent,
      args.chatRecentLimit,
      assistantMsg
    );

    appendTaskFlowAssistantResult({
      setGptMessages: args.setGptMessages,
      assistantMessage: assistantMsg,
      setGptState: args.setGptState,
      persistCurrentGptState: args.persistCurrentGptState,
      gptStateRef: args.gptStateRef,
      recentMessages: updatedRecent,
      lastUserIntent: `タスク更新: ${finalizedTitle}`,
    });

    const source = buildGptTaskUpdateSource(parsedInput.freeText || additionalText);

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
    await applyTaskFlowSummaryUsage({
      recentMessages: updatedRecent,
      applySummaryUsage: args.applySummaryUsage,
      handleGptMemory: args.handleGptMemory,
      currentTaskTitleOverride: finalizedTitle,
      lastUserIntent: `タスク更新: ${finalizedTitle}`,
    });
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
        userInstruction: parsedInput.userInstruction || args.currentTaskDraft.userInstruction,
        actionInstruction:
          directionInstruction || "最新のGPTレス内容を反映して、タスク内容を整理・更新してください。",
        body: currentTaskText,
        material: lastGptMessage.text.trim(),
      })
    : buildTaskStructuredInput({
        title: resolvedTitle,
        userInstruction:
          parsedInput.userInstruction ||
          directionInstruction ||
          "最新のGPTレス内容を反映して、タスク内容を整理してください。",
        body: lastGptMessage.text.trim(),
        searchRawText: args.currentTaskDraft.searchContext?.rawText || "",
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
    const baseRecent = getTaskFlowRecentMessages(args.gptStateRef);
    const updatedRecent = appendTaskFlowRecentMessage(
      baseRecent,
      args.chatRecentLimit,
      assistantMsg
    );

    appendTaskFlowAssistantResult({
      setGptMessages: args.setGptMessages,
      assistantMessage: assistantMsg,
      setGptState: args.setGptState,
      persistCurrentGptState: args.persistCurrentGptState,
      gptStateRef: args.gptStateRef,
      recentMessages: updatedRecent,
      lastUserIntent: `最新GPTレスからタスク更新: ${finalizedTitle}`,
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
        objective: (directionInstruction || lastGptMessage.text.trim()).slice(0, 120),
        sources: [source],
      })
    );

    args.applyTaskUsage(data?.usage);
    await applyTaskFlowSummaryUsage({
      recentMessages: updatedRecent,
      applySummaryUsage: args.applySummaryUsage,
      handleGptMemory: args.handleGptMemory,
      currentTaskTitleOverride: finalizedTitle,
      lastUserIntent: `最新GPTレスからタスク更新: ${finalizedTitle}`,
    });
  } catch (error) {
    console.error(error);
    appendTaskInfoMessage(args.setGptMessages, "Updating the task from the latest GPT message failed.");
  } finally {
    args.setGptLoading(false);
  }
}

export async function runAttachSearchResultToTaskFlow(
  args: AttachSearchResultToTaskFlowArgs
) {
  if (args.gptLoading) return;

  const currentTaskText = args.getTaskBaseText();
  const taskSearchContext = args.getTaskSearchContext();
  const taskLibraryItem = args.getTaskLibraryItem();

  const materialText =
    taskLibraryItem?.itemType === "search"
      ? taskSearchContext?.rawText?.trim() || taskLibraryItem.excerptText.trim()
      : taskLibraryItem?.excerptText.trim() || "";

  if (!materialText) {
    appendTaskInfoMessage(args.setGptMessages, "No library item is available to attach.");
    return;
  }

  const parsedInput = args.applyPrefixedTaskFieldsFromText(args.gptInput.trim());
  const resolvedTitle = resolveUpdateTaskTitle({
    explicitTitle: parsedInput.title,
    currentTitle: args.currentTaskDraft.title,
    currentTaskName: args.currentTaskDraft.taskName,
    freeText: parsedInput.freeText || args.gptInput.trim(),
    searchQuery: parsedInput.searchQuery || taskSearchContext?.query,
    fallback:
      args.currentTaskDraft.title ||
      taskLibraryItem?.title ||
      taskSearchContext?.query ||
      "Task",
    getResolvedTaskTitle: args.getResolvedTaskTitle,
  });

  if (!currentTaskText) {
    const prepInput = buildTaskStructuredInput({
      title: resolvedTitle,
      userInstruction:
        parsedInput.userInstruction || args.currentTaskDraft.userInstruction,
      body: materialText,
      searchRawText:
        taskLibraryItem?.itemType === "search"
          ? taskSearchContext?.rawText || ""
          : "",
    });

    startTaskFlowRequest({
      setGptMessages: args.setGptMessages,
      setGptInput: args.setGptInput,
      setGptLoading: args.setGptLoading,
    });

    try {
      const data = await runAutoPrepTask(prepInput, "attach-library-item");
      const taskText = formatTaskResultText(data?.parsed, data?.raw);
      const finalizedTitle = resolveTaskTitleFromResult({
        explicitTitle: parsedInput.title,
        currentTitle: args.currentTaskDraft.title,
        currentTaskName: args.currentTaskDraft.taskName,
        resultText: taskText,
        searchQuery: parsedInput.searchQuery || taskSearchContext?.query,
        fallback: resolvedTitle,
        getResolvedTaskTitle: args.getResolvedTaskTitle,
      });
      const assistantMsg: Message = {
        id: generateId(),
        role: "gpt",
        text: ["Library item imported into a new task.", taskText].join("\n\n"),
        meta: {
          kind: "task_prep",
          sourceType: taskLibraryItem?.itemType === "search" ? "search" : "manual",
        },
      };
      const baseRecent = getTaskFlowRecentMessages(args.gptStateRef);
      const updatedRecent = appendTaskFlowRecentMessage(
        baseRecent,
        args.chatRecentLimit,
        assistantMsg
      );

      appendTaskFlowAssistantResult({
        setGptMessages: args.setGptMessages,
        assistantMessage: assistantMsg,
        setGptState: args.setGptState,
        persistCurrentGptState: args.persistCurrentGptState,
        gptStateRef: args.gptStateRef,
        recentMessages: updatedRecent,
        lastUserIntent: `ライブラリアイテム「${taskLibraryItem?.title || finalizedTitle}」を新規タスクに取込`,
        activeReference: {
          title: taskLibraryItem?.title || taskSearchContext?.query || finalizedTitle,
          kind: taskLibraryItem?.itemType || "library",
          sourceId: taskLibraryItem?.id,
          excerpt: materialText.slice(0, 400),
        },
      });

      const source = buildLibraryTaskSource({
        taskLibraryItem,
        taskSearchContext,
        materialText,
      });

      args.setCurrentTaskDraft((prev) =>
        buildPreparedTaskDraftUpdate(prev, {
          title: finalizedTitle,
          userInstruction: parsedInput.userInstruction,
          body: taskText,
          searchContext:
            taskLibraryItem?.itemType === "search"
              ? taskSearchContext ?? prev.searchContext
              : prev.searchContext,
          objective:
            prev.objective ||
            parsedInput.freeText ||
            taskLibraryItem?.title ||
            taskSearchContext?.query ||
            "Imported from library item",
          prepText: taskText,
          sources: [source],
        })
      );

      args.applyTaskUsage(data?.usage);
      await applyTaskFlowSummaryUsage({
        recentMessages: updatedRecent,
        applySummaryUsage: args.applySummaryUsage,
        handleGptMemory: args.handleGptMemory,
        currentTaskTitleOverride: finalizedTitle,
        lastUserIntent: `ライブラリアイテム「${taskLibraryItem?.title || finalizedTitle}」を新規タスクに取込`,
        activeDocument: {
          title: taskLibraryItem?.title || taskSearchContext?.query || finalizedTitle,
          kind: taskLibraryItem?.itemType || "library",
          sourceId: taskLibraryItem?.id,
          excerpt: materialText.slice(0, 400),
          importedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error(error);
      appendTaskInfoMessage(
        args.setGptMessages,
        "Importing the library item into a new task failed."
      );
    } finally {
      args.setGptLoading(false);
    }
    return;
  }

  const taskInput = buildTaskInput({
    title: resolvedTitle,
    userInstruction: parsedInput.userInstruction || args.currentTaskDraft.userInstruction,
    actionInstruction: parsedInput.freeText || args.gptInput.trim(),
    body: currentTaskText,
    material: materialText,
  });

  startTaskFlowRequest({
    setGptMessages: args.setGptMessages,
    setGptInput: args.setGptInput,
    setGptLoading: args.setGptLoading,
  });

  try {
    const data = await runAutoPrepTask(taskInput, "attach-search-result");
    const taskText = formatTaskResultText(data?.parsed, data?.raw);
    const finalizedTitle = resolveTaskTitleFromResult({
      explicitTitle: parsedInput.title,
      currentTitle: args.currentTaskDraft.title,
      currentTaskName: args.currentTaskDraft.taskName,
      resultText: taskText,
      searchQuery: parsedInput.searchQuery || taskSearchContext?.query,
      fallback: resolvedTitle,
      getResolvedTaskTitle: args.getResolvedTaskTitle,
    });
    const assistantMsg: Message = {
      id: generateId(),
      role: "gpt",
      text: ["Library item attached to task.", taskText].join("\n\n"),
      meta: {
        kind: "task_prep",
        sourceType: taskLibraryItem?.itemType === "search" ? "search" : "manual",
      },
    };
    const baseRecent = getTaskFlowRecentMessages(args.gptStateRef);
    const updatedRecent = appendTaskFlowRecentMessage(
      baseRecent,
      args.chatRecentLimit,
      assistantMsg
    );

    appendTaskFlowAssistantResult({
      setGptMessages: args.setGptMessages,
      assistantMessage: assistantMsg,
      setGptState: args.setGptState,
      persistCurrentGptState: args.persistCurrentGptState,
      gptStateRef: args.gptStateRef,
      recentMessages: updatedRecent,
      lastUserIntent: `ライブラリアイテム「${taskLibraryItem?.title || finalizedTitle}」をタスクに統合`,
      activeReference: {
        title: taskLibraryItem?.title || taskSearchContext?.query || finalizedTitle,
        kind: taskLibraryItem?.itemType || "library",
        sourceId: taskLibraryItem?.id,
        excerpt: materialText.slice(0, 400),
      },
    });

    const source = buildLibraryTaskSource({
      taskLibraryItem,
      taskSearchContext: taskSearchContext ?? args.lastSearchContext,
      materialText,
    });

    args.setCurrentTaskDraft((prev) =>
      buildPreparedTaskDraftUpdate(prev, {
        title: finalizedTitle,
        userInstruction: parsedInput.userInstruction,
        body: taskText,
        searchContext:
          taskLibraryItem?.itemType === "search"
            ? taskSearchContext ?? prev.searchContext
            : prev.searchContext,
        sources: [source],
      })
    );

    args.applyTaskUsage(data?.usage);
    await applyTaskFlowSummaryUsage({
      recentMessages: updatedRecent,
      applySummaryUsage: args.applySummaryUsage,
      handleGptMemory: args.handleGptMemory,
      currentTaskTitleOverride: finalizedTitle,
      lastUserIntent: `ライブラリアイテム「${taskLibraryItem?.title || finalizedTitle}」をタスクに統合`,
      activeDocument: {
        title: taskLibraryItem?.title || taskSearchContext?.query || finalizedTitle,
        kind: taskLibraryItem?.itemType || "library",
        sourceId: taskLibraryItem?.id,
        excerpt: materialText.slice(0, 400),
        importedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(error);
    appendTaskInfoMessage(args.setGptMessages, "Attaching the library item to the task failed.");
  } finally {
    args.setGptLoading(false);
  }
}

export async function runDeepenTaskFromLastFlow(
  args: DeepenTaskFromLastFlowArgs
) {
  if (args.gptLoading) return;

  const text = args.getTaskBaseText();
  if (!text) {
    appendTaskInfoMessage(args.setGptMessages, "No task content was found to deepen.");
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
    userInstruction: parsedInput.userInstruction || args.currentTaskDraft.userInstruction,
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

  const baseRecent = getTaskFlowRecentMessages(args.gptStateRef);
  const newRecent = appendTaskFlowRecentMessage(
    baseRecent,
    args.chatRecentLimit,
    userMsg
  );

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
    const updatedRecent = appendTaskFlowRecentMessage(
      newRecent,
      args.chatRecentLimit,
      assistantMsg
    );

    appendTaskFlowAssistantResult({
      setGptMessages: args.setGptMessages,
      assistantMessage: assistantMsg,
      setGptState: args.setGptState,
      persistCurrentGptState: args.persistCurrentGptState,
      gptStateRef: args.gptStateRef,
      recentMessages: updatedRecent,
      lastUserIntent: `タスク深掘り: ${resolvedTitle}`,
    });

    args.setCurrentTaskDraft((prev) =>
      buildDeepenedTaskDraftUpdate(prev, {
        title: resolvedTitle,
        userInstruction: parsedInput.userInstruction,
        body: taskText,
      })
    );

    args.applyTaskUsage(data?.usage);
    await applyTaskFlowSummaryUsage({
      recentMessages: updatedRecent,
      applySummaryUsage: args.applySummaryUsage,
      handleGptMemory: args.handleGptMemory,
      currentTaskTitleOverride: resolvedTitle,
      lastUserIntent: `タスク深掘り: ${resolvedTitle}`,
    });
  } catch (error) {
    console.error(error);
    appendTaskInfoMessage(args.setGptMessages, "Deepening the task failed.");
  } finally {
    args.setGptLoading(false);
  }
}

export type PrepTaskFromInputFlowArgs = CommonTaskDraftFlowArgs & {
  gptInput: string;
};

export type UpdateTaskFromInputFlowArgs = CommonTaskDraftFlowArgs & {
  gptInput: string;
};

export type UpdateTaskFromLastGptMessageFlowArgs = CommonTaskDraftFlowArgs & {
  gptInput: string;
  gptMessages: Message[];
};

export type AttachSearchResultToTaskFlowArgs = CommonTaskDraftFlowArgs & {
  gptInput: string;
  lastSearchContext: SearchContext | null;
  getTaskLibraryItem: () => ReferenceLibraryItem | null;
};

export type DeepenTaskFromLastFlowArgs = CommonTaskDraftFlowArgs & {
  gptInput: string;
};
