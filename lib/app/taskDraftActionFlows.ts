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
import { createTaskSource } from "@/lib/app/taskDraftHelpers";
import {
  appendTaskInfoMessage,
  applyTaskMemoryBridge,
} from "@/lib/app/taskDraftFlowShared";
import type { Message, ReferenceLibraryItem } from "@/types/chat";
import type { SearchContext, TaskDraft } from "@/types/task";
import { normalizeUsage } from "@/lib/tokenStats";

type ParsedInputLike = {
  title?: string;
  userInstruction?: string;
  freeText?: string;
  searchQuery?: string;
};

type SetTaskDraft = Dispatch<SetStateAction<TaskDraft>>;

type CommonTaskDraftFlowArgs = {
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
  setGptState: Dispatch<SetStateAction<any>>;
  persistCurrentGptState?: (state: any) => void;
  setCurrentTaskDraft: SetTaskDraft;
  gptStateRef: MutableRefObject<{ recentMessages?: Message[] }>;
  chatRecentLimit: number;
  applyTaskUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
  applySummaryUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
  handleGptMemory: (
    recent: Message[],
    options?: {
      topicSeed?: string;
      lastUserIntent?: string;
      activeDocument?: Record<string, unknown> | null;
    }
  ) => Promise<{ summaryUsage: Parameters<typeof normalizeUsage>[0] | null }>;
};

export async function runPrepTaskFromInputFlow(
  args: CommonTaskDraftFlowArgs & { gptInput: string }
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

  const baseRecent = args.gptStateRef.current.recentMessages || [];
  const newRecent = [...baseRecent, userMsg].slice(-args.chatRecentLimit);

  args.setGptMessages((prev) => [...prev, userMsg]);
  args.setGptInput("");
  args.setGptLoading(true);

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
    const updatedRecent = [...newRecent, assistantMsg].slice(-args.chatRecentLimit);

    args.setGptMessages((prev) => [...prev, assistantMsg]);
    applyTaskMemoryBridge({
      setGptState: args.setGptState,
      persistCurrentGptState: args.persistCurrentGptState,
      gptStateRef: args.gptStateRef,
      recentMessages: updatedRecent,
      topic: resolvedTitle,
      taskTitle: resolvedTitle,
      lastUserIntent: `タスク整理: ${resolvedTitle}`,
    });

    const source = createTaskSource("gpt_chat", "GPT task prep", text);
    args.setCurrentTaskDraft((prev) => ({
      ...prev,
      taskName: resolvedTitle,
      title: resolvedTitle,
      userInstruction: parsedInput.userInstruction || prev.userInstruction,
      body: taskText,
      searchContext: args.currentTaskDraft.searchContext ?? prev.searchContext,
      objective: (parsedInput.freeText || text).slice(0, 120),
      prepText: taskText,
      deepenText: "",
      mergedText: taskText,
      kinTaskText: "",
      status: "prepared",
      sources: [...prev.sources, source],
      updatedAt: new Date().toISOString(),
    }));

    args.applyTaskUsage(data?.usage);
    const memoryResult = await args.handleGptMemory(updatedRecent, {
      topicSeed: resolvedTitle,
      lastUserIntent: `タスク整理: ${resolvedTitle}`,
    });
    if (memoryResult.summaryUsage) {
      args.applySummaryUsage(memoryResult.summaryUsage);
    }
  } catch (error) {
    console.error(error);
    appendTaskInfoMessage(args.setGptMessages, "Task preparation failed.");
  } finally {
    args.setGptLoading(false);
  }
}

export async function runUpdateTaskFromInputFlow(
  args: CommonTaskDraftFlowArgs & { gptInput: string }
) {
  if (!args.gptInput.trim() || args.gptLoading) return;

  const currentTaskText = args.getTaskBaseText();
  if (!currentTaskText) {
    appendTaskInfoMessage(args.setGptMessages, "No current task content was found to update.");
    return;
  }

  const additionalText = args.gptInput.trim();
  const parsedInput = args.applyPrefixedTaskFieldsFromText(additionalText);
  const resolvedTitle = args.getResolvedTaskTitle({
    explicitTitle: parsedInput.title,
    freeText: parsedInput.freeText || additionalText,
    searchQuery: parsedInput.searchQuery,
    fallback: args.currentTaskDraft.title || "Task",
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

  const baseRecent = args.gptStateRef.current.recentMessages || [];
  const newRecent = [...baseRecent, userMsg].slice(-args.chatRecentLimit);

  args.setGptMessages((prev) => [...prev, userMsg]);
  args.setGptInput("");
  args.setGptLoading(true);

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
    const updatedRecent = [...newRecent, assistantMsg].slice(-args.chatRecentLimit);

    args.setGptMessages((prev) => [...prev, assistantMsg]);
    applyTaskMemoryBridge({
      setGptState: args.setGptState,
      persistCurrentGptState: args.persistCurrentGptState,
      gptStateRef: args.gptStateRef,
      recentMessages: updatedRecent,
      topic: resolvedTitle,
      taskTitle: resolvedTitle,
      lastUserIntent: `タスク更新: ${resolvedTitle}`,
    });

    const source = createTaskSource(
      "manual_note",
      "GPT task update",
      parsedInput.freeText || additionalText
    );

    args.setCurrentTaskDraft((prev) => ({
      ...prev,
      title: resolvedTitle,
      taskName: resolvedTitle,
      userInstruction: parsedInput.userInstruction || prev.userInstruction,
      body: taskText,
      prepText: prev.prepText || prev.mergedText,
      deepenText: "",
      mergedText: taskText,
      kinTaskText: "",
      status: "prepared",
      sources: [...prev.sources, source],
      updatedAt: new Date().toISOString(),
    }));

    args.applyTaskUsage(data?.usage);
    const memoryResult = await args.handleGptMemory(updatedRecent, {
      topicSeed: resolvedTitle,
      lastUserIntent: `タスク更新: ${resolvedTitle}`,
    });
    if (memoryResult.summaryUsage) {
      args.applySummaryUsage(memoryResult.summaryUsage);
    }
  } catch (error) {
    console.error(error);
    appendTaskInfoMessage(args.setGptMessages, "Task update failed.");
  } finally {
    args.setGptLoading(false);
  }
}

export async function runUpdateTaskFromLastGptMessageFlow(
  args: CommonTaskDraftFlowArgs & {
    gptInput: string;
    gptMessages: Message[];
  }
) {
  if (args.gptLoading) return;

  const currentTaskText = args.getTaskBaseText();
  if (!currentTaskText) {
    appendTaskInfoMessage(args.setGptMessages, "No current task content was found to update.");
    return;
  }

  const lastGptMessage = [...args.gptMessages]
    .reverse()
    .find((m) => m.role === "gpt" && typeof m.text === "string" && m.text.trim());

  if (!lastGptMessage) {
    appendTaskInfoMessage(args.setGptMessages, "No recent GPT message was found.");
    return;
  }

  const parsedInput = args.applyPrefixedTaskFieldsFromText(args.gptInput.trim());
  const resolvedTitle = args.getResolvedTaskTitle({
    explicitTitle: parsedInput.title,
    freeText: parsedInput.freeText || args.gptInput.trim(),
    searchQuery: parsedInput.searchQuery,
    fallback: args.currentTaskDraft.title || "Task",
  });

  const taskInput = buildTaskInput({
    title: resolvedTitle,
    userInstruction: parsedInput.userInstruction || args.currentTaskDraft.userInstruction,
    actionInstruction: parsedInput.freeText || args.gptInput.trim(),
    body: currentTaskText,
    material: lastGptMessage.text.trim(),
  });

  args.setGptInput("");
  args.setGptLoading(true);

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
    const baseRecent = args.gptStateRef.current.recentMessages || [];
    const updatedRecent = [...baseRecent, assistantMsg].slice(-args.chatRecentLimit);

    args.setGptMessages((prev) => [...prev, assistantMsg]);
    applyTaskMemoryBridge({
      setGptState: args.setGptState,
      persistCurrentGptState: args.persistCurrentGptState,
      gptStateRef: args.gptStateRef,
      recentMessages: updatedRecent,
      topic: resolvedTitle,
      taskTitle: resolvedTitle,
      lastUserIntent: `最新GPTレスからタスク更新: ${resolvedTitle}`,
    });

    const source = createTaskSource(
      "manual_note",
      "Latest GPT message",
      lastGptMessage.text.trim()
    );

    args.setCurrentTaskDraft((prev) => ({
      ...prev,
      title: resolvedTitle,
      taskName: resolvedTitle,
      userInstruction: parsedInput.userInstruction || prev.userInstruction,
      body: taskText,
      deepenText: "",
      mergedText: taskText,
      kinTaskText: "",
      status: "prepared",
      sources: [...prev.sources, source],
      updatedAt: new Date().toISOString(),
    }));

    args.applyTaskUsage(data?.usage);
    const memoryResult = await args.handleGptMemory(updatedRecent, {
      topicSeed: resolvedTitle,
      lastUserIntent: `最新GPTレスからタスク更新: ${resolvedTitle}`,
    });
    if (memoryResult.summaryUsage) {
      args.applySummaryUsage(memoryResult.summaryUsage);
    }
  } catch (error) {
    console.error(error);
    appendTaskInfoMessage(args.setGptMessages, "Updating the task from the latest GPT message failed.");
  } finally {
    args.setGptLoading(false);
  }
}

export async function runAttachSearchResultToTaskFlow(
  args: CommonTaskDraftFlowArgs & {
    gptInput: string;
    lastSearchContext: SearchContext | null;
    getTaskLibraryItem: () => ReferenceLibraryItem | null;
  }
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
  const resolvedTitle = args.getResolvedTaskTitle({
    explicitTitle: parsedInput.title,
    freeText: parsedInput.freeText || args.gptInput.trim(),
    searchQuery: parsedInput.searchQuery || taskSearchContext?.query,
    fallback:
      args.currentTaskDraft.title ||
      taskLibraryItem?.title ||
      taskSearchContext?.query ||
      "Task",
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

    args.setGptInput("");
    args.setGptLoading(true);

    try {
      const data = await runAutoPrepTask(prepInput, "attach-library-item");
      const taskText = formatTaskResultText(data?.parsed, data?.raw);
      const assistantMsg: Message = {
        id: generateId(),
        role: "gpt",
        text: ["Library item imported into a new task.", taskText].join("\n\n"),
        meta: {
          kind: "task_prep",
          sourceType: taskLibraryItem?.itemType === "search" ? "search" : "manual",
        },
      };
      const baseRecent = args.gptStateRef.current.recentMessages || [];
      const updatedRecent = [...baseRecent, assistantMsg].slice(-args.chatRecentLimit);

      args.setGptMessages((prev) => [...prev, assistantMsg]);
      applyTaskMemoryBridge({
        setGptState: args.setGptState,
        persistCurrentGptState: args.persistCurrentGptState,
        gptStateRef: args.gptStateRef,
        recentMessages: updatedRecent,
        topic: taskLibraryItem?.title || taskSearchContext?.query || resolvedTitle,
        taskTitle: resolvedTitle,
        lastUserIntent: `ライブラリアイテム「${taskLibraryItem?.title || resolvedTitle}」を新規タスクに取込`,
        activeReference: {
          title: taskLibraryItem?.title || taskSearchContext?.query || resolvedTitle,
          kind: taskLibraryItem?.itemType || "library",
          sourceId: taskLibraryItem?.id,
          excerpt: materialText.slice(0, 400),
        },
      });

      const source = createTaskSource(
        taskLibraryItem?.itemType === "search"
          ? "web_search"
          : taskLibraryItem?.itemType === "ingested_file"
            ? "file_ingest"
            : "kin_message",
        taskLibraryItem?.itemType === "search"
          ? `Search result: ${taskLibraryItem.title || taskSearchContext?.query || "Untitled"}`
          : `Library item: ${taskLibraryItem?.title || "Untitled"}`,
        materialText
      );

      args.setCurrentTaskDraft((prev) => ({
        ...prev,
        title: resolvedTitle,
        taskName: resolvedTitle,
        userInstruction: parsedInput.userInstruction || prev.userInstruction,
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
        deepenText: "",
        mergedText: taskText,
        kinTaskText: "",
        status: "prepared",
        sources: [...prev.sources, source],
        updatedAt: new Date().toISOString(),
      }));

      args.applyTaskUsage(data?.usage);
      const memoryResult = await args.handleGptMemory(updatedRecent, {
        topicSeed: taskLibraryItem?.title || taskSearchContext?.query || resolvedTitle,
        lastUserIntent: `ライブラリアイテム「${taskLibraryItem?.title || resolvedTitle}」を新規タスクに取込`,
        activeDocument: {
          title: taskLibraryItem?.title || taskSearchContext?.query || resolvedTitle,
          kind: taskLibraryItem?.itemType || "library",
          sourceId: taskLibraryItem?.id,
          excerpt: materialText.slice(0, 400),
          importedAt: new Date().toISOString(),
        },
      });
      if (memoryResult.summaryUsage) {
        args.applySummaryUsage(memoryResult.summaryUsage);
      }
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

  args.setGptInput("");
  args.setGptLoading(true);

  try {
    const data = await runAutoPrepTask(taskInput, "attach-search-result");
    const taskText = formatTaskResultText(data?.parsed, data?.raw);
    const assistantMsg: Message = {
      id: generateId(),
      role: "gpt",
      text: ["Library item attached to task.", taskText].join("\n\n"),
      meta: {
        kind: "task_prep",
        sourceType: taskLibraryItem?.itemType === "search" ? "search" : "manual",
      },
    };
    const baseRecent = args.gptStateRef.current.recentMessages || [];
    const updatedRecent = [...baseRecent, assistantMsg].slice(-args.chatRecentLimit);

    args.setGptMessages((prev) => [...prev, assistantMsg]);
    applyTaskMemoryBridge({
      setGptState: args.setGptState,
      persistCurrentGptState: args.persistCurrentGptState,
      gptStateRef: args.gptStateRef,
      recentMessages: updatedRecent,
      topic: taskLibraryItem?.title || taskSearchContext?.query || resolvedTitle,
      taskTitle: resolvedTitle,
      lastUserIntent: `ライブラリアイテム「${taskLibraryItem?.title || resolvedTitle}」をタスクに統合`,
      activeReference: {
        title: taskLibraryItem?.title || taskSearchContext?.query || resolvedTitle,
        kind: taskLibraryItem?.itemType || "library",
        sourceId: taskLibraryItem?.id,
        excerpt: materialText.slice(0, 400),
      },
    });

    const source = createTaskSource(
      taskLibraryItem?.itemType === "search"
        ? "web_search"
        : taskLibraryItem?.itemType === "ingested_file"
          ? "file_ingest"
          : "kin_message",
      taskLibraryItem?.itemType === "search"
        ? `Search result: ${taskLibraryItem.title || args.lastSearchContext?.query || "Untitled"}`
        : `Library item: ${taskLibraryItem?.title || "Untitled"}`,
      materialText
    );

    args.setCurrentTaskDraft((prev) => ({
      ...prev,
      title: resolvedTitle,
      taskName: resolvedTitle,
      userInstruction: parsedInput.userInstruction || prev.userInstruction,
      body: taskText,
      searchContext:
        taskLibraryItem?.itemType === "search"
          ? taskSearchContext ?? prev.searchContext
          : prev.searchContext,
      deepenText: "",
      mergedText: taskText,
      kinTaskText: "",
      status: "prepared",
      sources: [...prev.sources, source],
      updatedAt: new Date().toISOString(),
    }));

    args.applyTaskUsage(data?.usage);
    const memoryResult = await args.handleGptMemory(updatedRecent, {
      topicSeed: taskLibraryItem?.title || taskSearchContext?.query || resolvedTitle,
      lastUserIntent: `ライブラリアイテム「${taskLibraryItem?.title || resolvedTitle}」をタスクに統合`,
      activeDocument: {
        title: taskLibraryItem?.title || taskSearchContext?.query || resolvedTitle,
        kind: taskLibraryItem?.itemType || "library",
        sourceId: taskLibraryItem?.id,
        excerpt: materialText.slice(0, 400),
        importedAt: new Date().toISOString(),
      },
    });
    if (memoryResult.summaryUsage) {
      args.applySummaryUsage(memoryResult.summaryUsage);
    }
  } catch (error) {
    console.error(error);
    appendTaskInfoMessage(args.setGptMessages, "Attaching the library item to the task failed.");
  } finally {
    args.setGptLoading(false);
  }
}

export async function runDeepenTaskFromLastFlow(
  args: CommonTaskDraftFlowArgs & { gptInput: string }
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

  const baseRecent = args.gptStateRef.current.recentMessages || [];
  const newRecent = [...baseRecent, userMsg].slice(-args.chatRecentLimit);

  args.setGptMessages((prev) => [...prev, userMsg]);
  args.setGptInput("");
  args.setGptLoading(true);

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
    const updatedRecent = [...newRecent, assistantMsg].slice(-args.chatRecentLimit);

    args.setGptMessages((prev) => [...prev, assistantMsg]);
    applyTaskMemoryBridge({
      setGptState: args.setGptState,
      persistCurrentGptState: args.persistCurrentGptState,
      gptStateRef: args.gptStateRef,
      recentMessages: updatedRecent,
      topic: resolvedTitle,
      taskTitle: resolvedTitle,
      lastUserIntent: `タスク深掘り: ${resolvedTitle}`,
    });

    args.setCurrentTaskDraft((prev) => ({
      ...prev,
      title: resolvedTitle,
      taskName: resolvedTitle,
      userInstruction: parsedInput.userInstruction || prev.userInstruction,
      body: taskText,
      deepenText: taskText,
      mergedText: taskText,
      kinTaskText: "",
      status: "deepened",
      updatedAt: new Date().toISOString(),
    }));

    args.applyTaskUsage(data?.usage);
    const memoryResult = await args.handleGptMemory(updatedRecent, {
      topicSeed: resolvedTitle,
      lastUserIntent: `タスク深掘り: ${resolvedTitle}`,
    });
    if (memoryResult.summaryUsage) {
      args.applySummaryUsage(memoryResult.summaryUsage);
    }
  } catch (error) {
    console.error(error);
    appendTaskInfoMessage(args.setGptMessages, "Deepening the task failed.");
  } finally {
    args.setGptLoading(false);
  }
}
