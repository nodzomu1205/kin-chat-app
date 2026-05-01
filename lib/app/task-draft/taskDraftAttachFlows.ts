import { generateId } from "@/lib/shared/uuid";
import {
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
import {
  buildLibraryTaskSource,
  buildPreparedTaskDraftUpdate,
} from "@/lib/app/task-draft/taskDraftFlowProjection";
import {
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
  buildLibraryTaskAttachIntent,
  buildLibraryTaskFormationIntent,
} from "@/lib/app/task-draft/taskDraftIntentText";
import type { AttachSearchResultToTaskFlowArgs } from "@/lib/app/task-draft/taskDraftActionFlowTypes";
import type { Message } from "@/types/chat";
import {
  mergeTaskTitleInstructions,
  resolveGeneratedTaskTitle,
  resolveTaskDraftUserInstruction,
} from "@/lib/task/taskTitleGeneration";

function buildTaskDraftImageLibraryContext(args: AttachSearchResultToTaskFlowArgs) {
  return buildPresentationImageLibraryContext(
    getPresentationImageLibraryCandidates({
      enabled: args.imageLibraryReferenceEnabled,
      count: args.imageLibraryReferenceCount,
      referenceLibraryItems: args.referenceLibraryItems,
    })
  );
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

  const presentationMode =
    args.currentTaskDraft.mode === "presentation" ||
    isPresentationTaskInstruction(args.gptInput.trim());
  const normalizedInput = presentationMode
    ? stripPresentationTaskMarker(args.gptInput.trim())
    : args.gptInput.trim();
  const parsedInput = args.applyPrefixedTaskFieldsFromText(normalizedInput);
  const fallbackTitle = resolveUpdateTaskTitle({
    explicitTitle: parsedInput.title,
    currentTitle: args.currentTaskDraft.title,
    currentTaskName: args.currentTaskDraft.taskName,
    freeText: parsedInput.freeText || normalizedInput,
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
  const resolvedTitle = resolvePresentationTaskTitle({
    presentationMode,
    explicitTitle: parsedInput.title,
    currentTitle: args.currentTaskDraft.title,
    currentTaskName: args.currentTaskDraft.taskName,
    generatedTitle: resolvedTitleResult.title,
    fallbackTitle,
    preserveExistingTitle: !!currentTaskText,
  });
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
    const prepInput = presentationMode
      ? buildPresentationTaskStructuredInput({
          title: resolvedTitle,
          userInstruction: nextUserInstruction,
          body: parsedInput.freeText || normalizedInput,
          material: materialText,
          imageLibraryContext: buildTaskDraftImageLibraryContext(args),
        })
      : buildTaskStructuredInput({
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
      const data = presentationMode
        ? await runAutoPrepPresentationTask(prepInput, "attach-library-item-ppt")
        : await runAutoPrepTask(prepInput, "attach-library-item");
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
        text: [
          presentationMode
            ? "Library item imported into a new PPT design task."
            : "Library item imported into a new task.",
          taskText,
        ].join("\n\n"),
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
        lastUserIntent: buildLibraryTaskFormationIntent(
          taskLibraryItem?.title || resolvedTitle
        ),
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
          mode: presentationMode ? "presentation" : "normal",
          presentationPlan,
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
        formatTaskFlowErrorMessage(
          "Importing the library item into a new task failed.",
          error
        )
      );
    } finally {
      args.setGptLoading(false);
    }
    return;
  }

  const taskInput = presentationMode
    ? buildPresentationTaskStructuredInput({
        title: resolvedTitle,
        userInstruction: nextUserInstruction,
        currentPlanText: currentTaskText,
        body: parsedInput.freeText || normalizedInput,
        material: materialText,
        imageLibraryContext: buildTaskDraftImageLibraryContext(args),
      })
    : buildTaskInput({
        title: resolvedTitle,
        userInstruction: nextUserInstruction,
        actionInstruction: parsedInput.freeText || normalizedInput,
        body: currentTaskText,
        material: materialText,
      });

  startTaskFlowRequest({
    setGptMessages: args.setGptMessages,
    setGptInput: args.setGptInput,
    setGptLoading: args.setGptLoading,
  });

  try {
    const data = presentationMode
      ? await runAutoUpdatePresentationTask(taskInput, "attach-search-result-ppt")
      : await runAutoPrepTask(taskInput, "attach-search-result");
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
            ? "Library item attached to PPT design task."
            : "Library item attached to task.",
          taskText,
        ].join("\n\n"),
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
      lastUserIntent: buildLibraryTaskAttachIntent(
        taskLibraryItem?.title || resolvedTitle
      ),
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
        mode: presentationMode ? "presentation" : prev.mode,
        presentationPlan,
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
      formatTaskFlowErrorMessage(
        "Attaching the library item to the task failed.",
        error
      )
    );
  } finally {
    args.setGptLoading(false);
  }
}


