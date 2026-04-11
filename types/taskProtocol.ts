export type TaskOutputType =
  | "essay"
  | "presentation"
  | "summary"
  | "analysis"
  | "reply"
  | "bullet_list"
  | "comparison";

export type SearchResultMode = "summary" | "raw" | "summary_plus_raw";
export type TaskCountRule = "exact" | "at_least" | "up_to" | "around";

export type TaskIntent = {
  mode: "task";
  goal: string;
  output: {
    type: TaskOutputType;
    language?: string;
    tone?: string;
    length?: "short" | "medium" | "long";
    audience?: string;
  };
  workflow?: {
    askGptCount?: number;
    askGptCountRule?: TaskCountRule;
    askUserCount?: number;
    askUserCountRule?: TaskCountRule;
    searchRequestCount?: number;
    searchRequestCountRule?: TaskCountRule;
    libraryReferenceCount?: number;
    libraryReferenceCountRule?: TaskCountRule;
    allowMaterialRequest?: boolean;
    allowSearchRequest?: boolean;
    allowLibraryReference?: boolean;
    finalizationPolicy?:
      | "auto_when_ready"
      | "wait_for_user_confirm"
      | "wait_for_required_materials";
  };
  constraints?: string[];
  entities?: string[];
};

export type PendingExternalRequest = {
  id: string;
  taskId: string;
  actionId: string;
  target: "user" | "material";
  kind: "question" | "request_material";
  body: string;
  status: "pending" | "answered" | "cancelled";
  createdAt: number;
  answeredAt?: number;
  answerText?: string;
  required: boolean;
};

export type TaskRequirementProgress = {
  id: string;
  label: string;
  category: "required" | "optional";
  kind:
    | "ask_gpt"
    | "ask_user"
    | "request_material"
    | "search_request"
    | "library_reference"
    | "finalize";
  targetCount?: number;
  completedCount?: number;
  status: "not_started" | "in_progress" | "pending" | "done" | "blocked";
};

export type UserFacingTaskRequest = {
  requestId: string;
  taskId: string;
  actionId: string;
  kind: "question" | "request_material";
  body: string;
  required: boolean;
  status: "pending" | "answered" | "cancelled";
  createdAt: number;
  answeredAt?: number;
  answerText?: string;
};

export type TaskExecutionStatus =
  | "idle"
  | "running"
  | "waiting_user"
  | "waiting_material"
  | "ready_to_resume"
  | "completed";

export type TaskProtocolEventType =
  | "task_progress"
  | "ask_gpt"
  | "gpt_response"
  | "search_request"
  | "search_response"
  | "library_index_request"
  | "library_index_response"
  | "library_item_request"
  | "library_item_response"
  | "user_question"
  | "material_request"
  | "task_done"
  | "task_confirm";

export type TaskProtocolEvent = {
  type: TaskProtocolEventType;
  taskId?: string;
  actionId?: string;
  status?: string;
  body: string;
  required?: boolean;
  summary?: string;
  query?: string;
  searchEngine?: string;
  searchLocation?: string;
  outputMode?: SearchResultMode;
  rawResultId?: string;
  partIndex?: number;
  totalParts?: number;
  characters?: number;
};

export type TaskRuntimeState = {
  currentTaskId: string | null;
  currentTaskTitle: string;
  currentTaskIntent: TaskIntent | null;
  compiledTaskPrompt: string;
  taskStatus: TaskExecutionStatus;
  latestSummary: string;
  requirementProgress: TaskRequirementProgress[];
  pendingRequests: PendingExternalRequest[];
  userFacingRequests: UserFacingTaskRequest[];
  completedSearches: Array<{
    taskId: string;
    actionId?: string;
    query: string;
    searchEngine?: string;
    searchLocation?: string;
    mode: SearchResultMode;
    rawResultId?: string;
    resultText: string;
    createdAt: number;
  }>;
  protocolLog: Array<{
    taskId: string;
    direction: "kin_to_gpt" | "gpt_to_kin" | "user_to_kin" | "system";
    type: string;
    body: string;
    createdAt: number;
  }>;
};

export type ChatBridgeSettings = {
  injectTaskContextOnReference: boolean;
  alwaysShowCurrentTaskInChatContext: boolean;
};
