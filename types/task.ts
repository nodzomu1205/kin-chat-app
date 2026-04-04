export type TaskType = "PREP_TASK" | "DEEPEN_TASK" | "FORMAT_TASK";

export type DataKind =
  | "knowledge_package"
  | "codebase_package"
  | "document_package"
  | "draft_text"
  | "mixed_package";

export type TaskPriority = "HIGH" | "MID" | "LOW";

export type TaskVisibility = "INTERNAL" | "USER_VISIBLE";

export type TaskResponseMode = "SILENT_RESULT" | "STRUCTURED_RESULT";

export type GroundingMode = "STRICT" | "BALANCED" | "CREATIVE";

export type TaskRequest = {
  type: TaskType;
  taskId: string;
  dataKind: DataKind;
  goal: string;
  inputRef: string;
  inputSummary: string;
  constraints: string[];
  outputFormat: string;
  priority: TaskPriority;
  visibility: TaskVisibility;
  responseMode: TaskResponseMode;
  groundingMode?: GroundingMode;
};

export type TaskResultStatus = "OK" | "PARTIAL" | "NEEDS_MORE";

export type TaskResult = {
  taskId: string;
  type: TaskType;
  status: TaskResultStatus;
  summary: string;
  keyPoints: string[];
  detailBlocks: {
    title: string;
    body: string[];
  }[];
  warnings: string[];
  missingInfo: string[];
  nextSuggestion: string[];
};

export type TaskSourceType =
  | "gpt_chat"
  | "file_ingest"
  | "web_search"
  | "manual_note"
  | "kin_message";

export type TaskSource = {
  id: string;
  type: TaskSourceType;
  label: string;
  content: string;
  createdAt: string;
};

export type TaskDraftStatus =
  | "idle"
  | "prepared"
  | "deepened"
  | "formatted";

export type TaskDraft = {
  id: string;
  taskId: string;
  title: string;
  taskName: string;
  objective: string;
  prepText: string;
  deepenText: string;
  mergedText: string;
  kinTaskText: string;
  status: TaskDraftStatus;
  sources: TaskSource[];
  updatedAt: string;
};

let taskDraftSequence = 1;

export function createTaskDraftId(): string {
  return `task-draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultTaskName(): string {
  const label = `タスク ${String(taskDraftSequence).padStart(3, "0")}`;
  taskDraftSequence += 1;
  return label;
}

export function createEmptyTaskDraft(): TaskDraft {
  const taskId = createTaskDraftId();
  const taskName = createDefaultTaskName();

  return {
    id: taskId,
    taskId,
    title: taskName,
    taskName,
    objective: "",
    prepText: "",
    deepenText: "",
    mergedText: "",
    kinTaskText: "",
    status: "idle",
    sources: [],
    updatedAt: new Date().toISOString(),
  };
}
