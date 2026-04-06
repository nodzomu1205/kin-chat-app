export type TaskOutputType =
  | "essay"
  | "presentation"
  | "summary"
  | "analysis"
  | "reply"
  | "bullet_list"
  | "comparison";

export type SearchResultMode = "summary" | "raw" | "summary_plus_raw";

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
    askUserCount?: number;
    allowMaterialRequest?: boolean;
    allowSearchRequest?: boolean;
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
    | "finalize";
  targetCount?: number;
  completedCount?: number;
  status: "not_started" | "in_progress" | "pending" | "done" | "blocked";
};

export type UserFacingTaskRequest = {
  requestId: string;
  taskId: string;
  kind: "question" | "request_material";
  body: string;
  required: boolean;
  status: "pending" | "answered" | "cancelled";
  createdAt: number;
  answeredAt?: number;
  answerText?: string;
};

export type TaskRuntimeState = {
  currentTaskId: string | null;
  currentTaskTitle: string;
  currentTaskIntent: TaskIntent | null;
  compiledTaskPrompt: string;
  requirementProgress: TaskRequirementProgress[];
  pendingRequests: PendingExternalRequest[];
  userFacingRequests: UserFacingTaskRequest[];
  completedSearches: Array<{
    taskId: string;
    query: string;
    mode: SearchResultMode;
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