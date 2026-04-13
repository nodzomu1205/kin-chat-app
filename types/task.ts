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

export type SearchMode =
  | "normal"
  | "ai"
  | "integrated"
  | "youtube"
  | "ai_first"
  | "news"
  | "geo"
  | "travel"
  | "product"
  | "entity"
  | "evidence";

export type SearchEngine =
  | "google_search"
  | "google_ai_mode"
  | "google_news"
  | "google_maps"
  | "google_local"
  | "youtube_search"
  | "google_flights"
  | "google_hotels"
  | "google_shopping"
  | "amazon_search";

export type SearchSourceItem = {
  title: string;
  link: string;
  snippet?: string;
  sourceType?: string;
  publishedAt?: string;
  thumbnailUrl?: string;
  channelName?: string;
  duration?: string;
  viewCount?: string;
  videoId?: string;
};

export type SearchProductItem = {
  title: string;
  link?: string;
  price?: string;
  source?: string;
  rating?: number;
};

export type SearchLocalResultItem = {
  title: string;
  address?: string;
  link?: string;
  rating?: number;
  reviews?: number;
};

export type SearchFlightItem = {
  airline?: string;
  price?: string;
  departure?: string;
  arrival?: string;
  duration?: string;
};

export type SearchHotelItem = {
  title: string;
  link?: string;
  price?: string;
  rating?: number;
  location?: string;
};

export type SearchEntityProfile = {
  name?: string;
  description?: string;
  website?: string;
  notableFacts?: string[];
};

export type SearchContext = {
  id?: string;
  rawResultId: string;
  mode?: SearchMode;
  engine?: SearchEngine;
  engines?: SearchEngine[];
  seriesId?: string;
  continuationToken?: string;
  taskId?: string;
  actionId?: string;
  query: string;
  location?: string;
  goal?: string;
  outputMode?: "summary" | "summary_with_sources" | "raw_and_summary";
  summaryText?: string;
  aiSummary?: string;
  rawText: string;
  sources: SearchSourceItem[];
  products?: SearchProductItem[];
  localResults?: SearchLocalResultItem[];
  flights?: SearchFlightItem[];
  hotels?: SearchHotelItem[];
  entityProfile?: SearchEntityProfile;
  metadata?: Record<string, unknown>;
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
  slot: number;

  title: string;
  userInstruction: string;
  body: string;
  searchContext: SearchContext | null;

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

export function createTaskDraftId(): string {
  return "";
}

export function createDefaultTaskName(): string {
  return "";
}

export function createEmptyTaskDraft(): TaskDraft {
  return {
    id: "",
    taskId: "",
    slot: 1,

    title: "",
    userInstruction: "",
    body: "",
    searchContext: null,

    taskName: "",
    objective: "",
    prepText: "",
    deepenText: "",
    mergedText: "",
    kinTaskText: "",
    status: "idle",
    sources: [],
    updatedAt: "",
  };
}
