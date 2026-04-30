import { createTaskSource } from "@/lib/app/task-draft/taskDraftHelpers";
import type { ReferenceLibraryItem } from "@/types/chat";
import type { SearchContext, TaskDraft, TaskDraftStatus, TaskSource } from "@/types/task";

export type PreparedTaskDraftUpdateParams = {
  title: string;
  userInstruction?: string;
  body: string;
  mode?: TaskDraft["mode"];
  presentationPlan?: TaskDraft["presentationPlan"];
  taskTitleDebug?: TaskDraft["taskTitleDebug"];
  objective?: string;
  prepText?: string;
  searchContext?: TaskDraft["searchContext"];
  sources?: TaskSource[];
  preservePrepText?: boolean;
};

export function buildPreparedTaskDraftUpdate(
  previous: TaskDraft,
  params: PreparedTaskDraftUpdateParams
): TaskDraft {
  return {
    ...previous,
    title: params.title,
    taskName: params.title,
    mode: params.mode || previous.mode || "normal",
    presentationPlan:
      params.presentationPlan !== undefined
        ? params.presentationPlan
        : previous.presentationPlan,
    userInstruction: params.userInstruction || previous.userInstruction,
    body: params.body,
    taskTitleDebug:
      params.taskTitleDebug !== undefined
        ? params.taskTitleDebug
        : previous.taskTitleDebug,
    ...(params.objective !== undefined ? { objective: params.objective } : {}),
    ...(params.searchContext !== undefined
      ? { searchContext: params.searchContext }
      : {}),
    prepText: params.preservePrepText
      ? previous.prepText || previous.mergedText
      : (params.prepText ?? params.body),
    deepenText: "",
    mergedText: params.body,
    kinTaskText: "",
    status: "prepared",
    sources: params.sources ? [...previous.sources, ...params.sources] : previous.sources,
    updatedAt: new Date().toISOString(),
  };
}

export function buildDeepenedTaskDraftUpdate(
  previous: TaskDraft,
  params: {
    title: string;
    userInstruction?: string;
    taskTitleDebug?: TaskDraft["taskTitleDebug"];
    body: string;
    status?: TaskDraftStatus;
  }
): TaskDraft {
  return {
    ...previous,
    title: params.title,
    taskName: params.title,
    userInstruction: params.userInstruction || previous.userInstruction,
    body: params.body,
    taskTitleDebug:
      params.taskTitleDebug !== undefined
        ? params.taskTitleDebug
        : previous.taskTitleDebug,
    deepenText: params.body,
    mergedText: params.body,
    kinTaskText: "",
    status: params.status || "deepened",
    updatedAt: new Date().toISOString(),
  };
}

export function buildLibraryTaskSource(params: {
  taskLibraryItem: ReferenceLibraryItem | null;
  taskSearchContext: SearchContext | null;
  materialText: string;
}): TaskSource {
  const { taskLibraryItem, taskSearchContext, materialText } = params;
  return createTaskSource(
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
}
