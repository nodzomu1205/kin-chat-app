import { generateId } from "@/lib/shared/uuid";
import {
  buildTaskInput,
  formatTaskResultText,
  runAutoDeepenTask,
  runAutoUpdatePresentationTask,
} from "@/lib/app/gpt-task/gptTaskClient";
import {
  buildDeepenedTaskDraftUpdate,
  buildPreparedTaskDraftUpdate,
} from "@/lib/app/task-draft/taskDraftFlowProjection";
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
  appendTaskInfoMessage,
  buildTaskFlowRecentContext,
  completeTaskFlowSuccess,
  formatTaskFlowErrorMessage,
  startTaskFlowRequest,
} from "@/lib/app/task-draft/taskDraftFlowShared";
import { buildTaskDeepenIntent } from "@/lib/app/task-draft/taskDraftIntentText";
import type { DeepenTaskFromLastFlowArgs } from "@/lib/app/task-draft/taskDraftActionFlowTypes";
import type { Message } from "@/types/chat";
import {
  mergeTaskTitleInstructions,
  resolveGeneratedTaskTitle,
  resolveTaskDraftUserInstruction,
} from "@/lib/task/taskTitleGeneration";

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

  const presentationMode =
    args.currentTaskDraft.mode === "presentation" ||
    isPresentationTaskInstruction(args.gptInput.trim());
  const normalizedInput = presentationMode
    ? stripPresentationTaskMarker(args.gptInput.trim())
    : args.gptInput.trim();
  const parsedInput = args.applyPrefixedTaskFieldsFromText(normalizedInput);
  const fallbackTitle = args.getResolvedTaskTitle({
    explicitTitle: parsedInput.title,
    freeText: parsedInput.freeText || normalizedInput,
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
    parsedInput.freeText,
    args.currentTaskDraft.userInstruction
  );

  const taskInput = presentationMode
    ? buildPresentationTaskStructuredInput({
        title: resolvedTitle,
        userInstruction: nextUserInstruction,
        currentPlanText: text,
        body: parsedInput.freeText || normalizedInput || "PPT設計書を深掘り",
        material: text,
        libraryReferenceContext: args.buildLibraryReferenceContext(),
      })
    : buildTaskInput({
        title: resolvedTitle,
        userInstruction: nextUserInstruction,
        actionInstruction: parsedInput.freeText || normalizedInput,
        body: text,
        material: text,
        libraryReferenceContext: args.buildLibraryReferenceContext(),
      });

  const userMsg: Message = {
    id: generateId(),
    role: "user",
    text: presentationMode
      ? `[PPT design deepen]\n${parsedInput.freeText || "PPT設計書の深掘り"}`
      : `[Deepen]\n${parsedInput.freeText || "Deeper analysis requested."}`,
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
    const data = presentationMode
      ? await runAutoUpdatePresentationTask(taskInput, "current-ppt-task")
      : await runAutoDeepenTask(taskInput, "current-task");
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
      lastUserIntent: buildTaskDeepenIntent(resolvedTitle),
      applyChatUsage: args.applyChatUsage,
      applyCompressionUsage: args.applyCompressionUsage,
      handleGptMemory: args.handleGptMemory,
      currentTaskTitleOverride: resolvedTitle,
    });

    args.setCurrentTaskDraft((prev) =>
      presentationMode
        ? buildPreparedTaskDraftUpdate(prev, {
            title: resolvedTitle,
            userInstruction: nextUserInstruction,
            taskTitleDebug: resolvedTitleResult.debug,
            mode: "presentation",
            presentationPlan,
            body: taskText,
            preservePrepText: true,
          })
        : buildDeepenedTaskDraftUpdate(prev, {
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


