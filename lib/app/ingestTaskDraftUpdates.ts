import { buildMergedTaskInput } from "@/lib/app/gptTaskClient";
import { createTaskSource } from "@/lib/app/taskDraftHelpers";
import type { TaskDraft } from "@/types/task";
import type { PostIngestAction } from "@/components/panels/gpt/gptPanelTypes";

export function buildAttachCurrentTaskMergedInput(params: {
  currentTaskText: string;
  fileName: string;
  prepInput: string;
  currentTaskDraft: TaskDraft;
  fileTitle: string;
  getResolvedTaskTitle: (params: {
    explicitTitle?: string;
    freeText?: string;
    searchQuery?: string;
    fallback?: string;
  }) => string;
}) {
  return buildMergedTaskInput(
    params.currentTaskText,
    `FILE: ${params.fileName}`,
    params.prepInput,
    {
      title: params.getResolvedTaskTitle({
        explicitTitle: params.currentTaskDraft.title || params.fileTitle,
        freeText: params.prepInput,
        fallback: params.fileName,
      }),
      userInstruction: params.currentTaskDraft.userInstruction,
      searchRawText: params.currentTaskDraft.searchContext?.rawText || "",
    }
  );
}

export function buildAttachCurrentTaskDraftUpdate(params: {
  previousDraft: TaskDraft;
  fileName: string;
  fileTitle: string;
  prepInput: string;
  mergedTaskText: string;
  resolveTaskTitleFromDraft: (
    draft: TaskDraft,
    params: {
      explicitTitle?: string;
      freeText?: string;
      searchQuery?: string;
      fallback?: string;
    }
  ) => string;
  objectiveFallback?: string;
}) {
  const source = createTaskSource(
    "file_ingest",
    `FILE: ${params.fileName}`,
    params.prepInput
  );
  const nextTitle = params.resolveTaskTitleFromDraft(params.previousDraft, {
    explicitTitle: params.previousDraft.title || params.fileTitle,
    freeText: params.prepInput,
    fallback: params.fileName,
  });

  return {
    ...params.previousDraft,
    taskName: nextTitle,
    title: nextTitle,
    body: params.mergedTaskText,
    objective:
      params.previousDraft.objective ||
      params.objectiveFallback ||
      `Attached file ${params.fileName}`,
    deepenText: "",
    mergedText: params.mergedTaskText,
    kinTaskText: "",
    status: "prepared" as const,
    sources: [...params.previousDraft.sources, source],
    updatedAt: new Date().toISOString(),
  };
}

export function buildPostIngestTaskDraftUpdate(params: {
  previousDraft: TaskDraft;
  action: PostIngestAction;
  fileName: string;
  fileTitle: string;
  prepInput: string;
  prepTaskText: string;
  deepenTaskText: string;
  getResolvedTaskTitle: (args: {
    explicitTitle?: string;
    freeText?: string;
    searchQuery?: string;
    fallback?: string;
  }) => string;
  objectiveBuilder?: (fileName: string) => string;
}) {
  const source = createTaskSource(
    "file_ingest",
    `FILE: ${params.fileName}`,
    params.prepInput
  );
  const buildObjective =
    params.objectiveBuilder ||
    ((fileName: string) => `Prepared from file ${fileName}`);

  if (params.action === "inject_and_prep" && params.prepTaskText) {
    const title = params.getResolvedTaskTitle({
      explicitTitle: params.fileTitle,
      freeText: params.prepInput,
      fallback: params.fileName,
    });

    return {
      ...params.previousDraft,
      taskName: title,
      title,
      body: params.prepTaskText,
      objective: buildObjective(params.fileName),
      prepText: params.prepTaskText,
      deepenText: "",
      mergedText: params.prepTaskText,
      kinTaskText: "",
      status: "prepared" as const,
      sources: [...params.previousDraft.sources, source],
      updatedAt: new Date().toISOString(),
    };
  }

  if (params.action === "inject_prep_deepen") {
    const finalText = params.deepenTaskText || params.prepTaskText;
    if (!finalText) {
      return params.previousDraft;
    }

    const title = params.getResolvedTaskTitle({
      explicitTitle: params.fileTitle,
      freeText: finalText,
      fallback: params.fileName,
    });

    return {
      ...params.previousDraft,
      taskName: title,
      title,
      body: finalText,
      objective: buildObjective(params.fileName),
      prepText: params.prepTaskText,
      deepenText: params.deepenTaskText,
      mergedText: finalText,
      kinTaskText: "",
      status: params.deepenTaskText ? ("deepened" as const) : ("prepared" as const),
      sources: [...params.previousDraft.sources, source],
      updatedAt: new Date().toISOString(),
    };
  }

  return params.previousDraft;
}
