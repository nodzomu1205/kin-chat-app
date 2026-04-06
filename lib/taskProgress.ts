import type {
  TaskIntent,
  TaskRequirementProgress,
  PendingExternalRequest,
  UserFacingTaskRequest,
} from "@/types/taskProtocol";

export function buildInitialRequirementProgress(intent: TaskIntent): TaskRequirementProgress[] {
  const items: TaskRequirementProgress[] = [];

  const askGptCount = intent.workflow?.askGptCount ?? 0;
  if (askGptCount > 0) {
    items.push({
      id: "ask_gpt",
      label: `GPTに${askGptCount}回質問`,
      category: "required",
      kind: "ask_gpt",
      targetCount: askGptCount,
      completedCount: 0,
      status: "not_started",
    });
  }

  const askUserCount = intent.workflow?.askUserCount ?? 0;
  if (askUserCount > 0) {
    items.push({
      id: "ask_user",
      label: `ユーザーに${askUserCount}回確認`,
      category: "optional",
      kind: "ask_user",
      targetCount: askUserCount,
      completedCount: 0,
      status: "not_started",
    });
  }

  if (intent.workflow?.allowMaterialRequest) {
    items.push({
      id: "request_material",
      label: "追加資料を要求",
      category: "optional",
      kind: "request_material",
      targetCount: 1,
      completedCount: 0,
      status: "not_started",
    });
  }

  if (intent.workflow?.allowSearchRequest) {
    items.push({
      id: "search_request",
      label: "Google検索を要求",
      category: "optional",
      kind: "search_request",
      targetCount: 1,
      completedCount: 0,
      status: "not_started",
    });
  }

  items.push({
    id: "finalize",
    label: "最終成果物を作成",
    category: "required",
    kind: "finalize",
    targetCount: 1,
    completedCount: 0,
    status: "not_started",
  });

  return items;
}

export function toUserFacingRequests(
  pendingRequests: PendingExternalRequest[]
): UserFacingTaskRequest[] {
  return pendingRequests.map((r) => ({
    requestId: r.id,
    taskId: r.taskId,
    kind: r.kind,
    body: r.body,
    required: r.required,
    status: r.status,
    createdAt: r.createdAt,
    answeredAt: r.answeredAt,
    answerText: r.answerText,
  }));
}

export function markRequirementProgress(
  progress: TaskRequirementProgress[],
  kind: TaskRequirementProgress["kind"],
  increment = 1
): TaskRequirementProgress[] {
  return progress.map((item) => {
    if (item.kind !== kind) return item;

    const nextCompleted = (item.completedCount ?? 0) + increment;
    const target = item.targetCount ?? 1;
    const done = nextCompleted >= target;

    return {
      ...item,
      completedCount: nextCompleted,
      status: done ? "done" : "in_progress",
    };
  });
}