import { generateId } from "@/lib/uuid";
import {
  buildTaskInput,
  buildTaskStructuredInput,
  formatTaskResultText,
  runAutoPrepTask,
} from "@/lib/app/gptTaskClient";
import {
  buildLibraryTaskSource,
  buildPreparedTaskDraftUpdate,
} from "@/lib/app/taskDraftFlowProjection";
import {
  resolveUpdateTaskTitle,
} from "@/lib/app/taskDraftFlowResolvers";
import {
  appendTaskInfoMessage,
  buildTaskFlowRecentContext,
  completeTaskFlowSuccess,
  startTaskFlowRequest,
} from "@/lib/app/taskDraftFlowShared";
import type { AttachSearchResultToTaskFlowArgs } from "@/lib/app/taskDraftActionFlowTypes";
import type { Message } from "@/types/chat";
import {
  mergeTaskTitleInstructions,
  resolveGeneratedTaskTitle,
  resolveTaskDraftUserInstruction,
} from "@/lib/taskTitleGeneration";

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
  const titleMaterialText =
    taskLibraryItem?.summary?.trim() ||
    taskLibraryItem?.excerptText.trim() ||
    materialText;

  if (!materialText) {
    appendTaskInfoMessage(
      args.setGptMessages,
      "No library item is available to attach."
    );
    return;
  }

  const parsedInput = args.applyPrefixedTaskFieldsFromText(args.gptInput.trim());
  const fallbackTitle = resolveUpdateTaskTitle({
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
  const resolvedTitleResult = await resolveGeneratedTaskTitle({
    explicitTitle: parsedInput.title,
    currentTitle: args.currentTaskDraft.title || args.currentTaskDraft.taskName,
    taskBody: currentTaskText || args.currentTaskDraft.body,
    additionalSource: titleMaterialText,
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

  const { requestRecentMessages } = buildTaskFlowRecentContext({
    gptStateRef: args.gptStateRef,
    chatRecentLimit: args.chatRecentLimit,
  });

  if (!currentTaskText) {
    const prepInput = buildTaskStructuredInput({
      title: resolvedTitle,
      userInstruction: nextUserInstruction,
      body: materialText,
      searchRawText:
        taskLibraryItem?.itemType === "search" ? taskSearchContext?.rawText || "" : "",
    });

    startTaskFlowRequest({
      setGptMessages: args.setGptMessages,
      setGptInput: args.setGptInput,
      setGptLoading: args.setGptLoading,
    });

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

      await completeTaskFlowSuccess({
        setGptMessages: args.setGptMessages,
        assistantMessage: assistantMsg,
        setGptState: args.setGptState,
        persistCurrentGptState: args.persistCurrentGptState,
        gptStateRef: args.gptStateRef,
        requestRecentMessages,
        chatRecentLimit: args.chatRecentLimit,
        lastUserIntent: `郢晢ｽｩ郢ｧ・､郢晄じﾎ帷ｹ晢ｽｪ郢ｧ・｢郢ｧ・､郢昴・ﾎ堤ｸｲ繝ｻ{taskLibraryItem?.title || resolvedTitle}邵ｲ髦ｪ・定ｭ・ｽｰ髫穂ｸ翫■郢ｧ・ｹ郢ｧ・ｯ邵ｺ・ｫ陷ｿ蜀ｶ・ｾ・ｼ`,
        activeReference: {
          title: taskLibraryItem?.title || taskSearchContext?.query || resolvedTitle,
          kind: taskLibraryItem?.itemType || "library",
          sourceId: taskLibraryItem?.id,
          excerpt: materialText.slice(0, 400),
        },
        applyChatUsage: args.applyChatUsage,
        applyCompressionUsage: args.applyCompressionUsage,
        handleGptMemory: args.handleGptMemory,
        currentTaskTitleOverride: resolvedTitle,
        activeDocument: {
          title: taskLibraryItem?.title || taskSearchContext?.query || resolvedTitle,
          kind: taskLibraryItem?.itemType || "library",
          sourceId: taskLibraryItem?.id,
          excerpt: materialText.slice(0, 400),
          importedAt: new Date().toISOString(),
        },
      });

      const source = buildLibraryTaskSource({
        taskLibraryItem,
        taskSearchContext,
        materialText,
      });

      args.setCurrentTaskDraft((prev) =>
        buildPreparedTaskDraftUpdate(prev, {
          title: resolvedTitle,
          userInstruction: nextUserInstruction,
          taskTitleDebug: resolvedTitleResult.debug,
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

      args.applyTaskUsage(resolvedTitleResult.usage, { countRun: false });
      args.applyTaskUsage(data?.usage);
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
    userInstruction: nextUserInstruction,
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
    const assistantMsg: Message = {
      id: generateId(),
      role: "gpt",
      text: ["Library item attached to task.", taskText].join("\n\n"),
      meta: {
        kind: "task_prep",
        sourceType: taskLibraryItem?.itemType === "search" ? "search" : "manual",
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
      lastUserIntent: `郢晢ｽｩ郢ｧ・､郢晄じﾎ帷ｹ晢ｽｪ郢ｧ・｢郢ｧ・､郢昴・ﾎ堤ｸｲ繝ｻ{taskLibraryItem?.title || resolvedTitle}邵ｲ髦ｪ・堤ｹｧ・ｿ郢ｧ・ｹ郢ｧ・ｯ邵ｺ・ｫ驍ｨ・ｱ陷ｷ繝ｻ`,
      activeReference: {
        title: taskLibraryItem?.title || taskSearchContext?.query || resolvedTitle,
        kind: taskLibraryItem?.itemType || "library",
        sourceId: taskLibraryItem?.id,
        excerpt: materialText.slice(0, 400),
      },
      applyChatUsage: args.applyChatUsage,
      applyCompressionUsage: args.applyCompressionUsage,
      handleGptMemory: args.handleGptMemory,
      currentTaskTitleOverride: resolvedTitle,
      activeDocument: {
        title: taskLibraryItem?.title || taskSearchContext?.query || resolvedTitle,
        kind: taskLibraryItem?.itemType || "library",
        sourceId: taskLibraryItem?.id,
        excerpt: materialText.slice(0, 400),
        importedAt: new Date().toISOString(),
      },
    });

    const source = buildLibraryTaskSource({
      taskLibraryItem,
      taskSearchContext: taskSearchContext ?? args.lastSearchContext,
      materialText,
    });

    args.setCurrentTaskDraft((prev) =>
      buildPreparedTaskDraftUpdate(prev, {
        title: resolvedTitle,
        userInstruction: nextUserInstruction,
        taskTitleDebug: resolvedTitleResult.debug,
        body: taskText,
        searchContext:
          taskLibraryItem?.itemType === "search"
            ? taskSearchContext ?? prev.searchContext
            : prev.searchContext,
        sources: [source],
      })
    );

    args.applyTaskUsage(resolvedTitleResult.usage, { countRun: false });
    args.applyTaskUsage(data?.usage);
  } catch (error) {
    console.error(error);
    appendTaskInfoMessage(
      args.setGptMessages,
      "Attaching the library item to the task failed."
    );
  } finally {
    args.setGptLoading(false);
  }
}


