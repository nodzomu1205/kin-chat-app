import type {
  PendingExternalRequest,
  TaskCountRule,
  TaskIntent,
  TaskRequirementProgress,
  UserFacingTaskRequest,
} from "@/types/taskProtocol";

function formatCountLabel(prefix: string, count: number, rule: TaskCountRule) {
  switch (rule) {
    case "at_least":
      return `${prefix}を最低${count}回`;
    case "up_to":
      return `${prefix}を最大${count}回`;
    case "around":
      return `${prefix}を${count}回前後`;
    case "exact":
    default:
      return `${prefix}を${count}回`;
  }
}

export function buildInitialRequirementProgress(
  intent: TaskIntent
): TaskRequirementProgress[] {
  const items: TaskRequirementProgress[] = [];

  const askGptCount = intent.workflow?.askGptCount ?? 0;
  if (askGptCount > 0) {
    items.push({
      id: "ask_gpt",
      label: formatCountLabel("GPTに質問", askGptCount, intent.workflow?.askGptCountRule ?? "exact"),
      category:
        intent.workflow?.askGptCountRule === "up_to" ? "optional" : "required",
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
      label: formatCountLabel("ユーザーに質問", askUserCount, intent.workflow?.askUserCountRule ?? "exact"),
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
      label: "資料を要求",
      category: "optional",
      kind: "request_material",
      targetCount: 1,
      completedCount: 0,
      status: "not_started",
    });
  }

  if (intent.workflow?.allowSearchRequest) {
    const searchCount = intent.workflow?.searchRequestCount ?? 1;
    const searchRule = intent.workflow?.searchRequestCountRule ?? "exact";
    items.push({
      id: "search_request",
      label: formatCountLabel("検索を要求", searchCount, searchRule),
      category: searchRule === "up_to" ? "optional" : "required",
      kind: "search_request",
      targetCount: searchCount,
      completedCount: 0,
      status: "not_started",
    });
  }

  if (intent.workflow?.allowYoutubeTranscriptRequest) {
    const transcriptCount = intent.workflow?.youtubeTranscriptRequestCount ?? 1;
    const transcriptRule =
      intent.workflow?.youtubeTranscriptRequestCountRule ?? "exact";
    items.push({
      id: "youtube_transcript_request",
      label: formatCountLabel(
        "YouTube transcript取得",
        transcriptCount,
        transcriptRule
      ),
      category: transcriptRule === "up_to" ? "optional" : "required",
      kind: "youtube_transcript_request",
      targetCount: transcriptCount,
      completedCount: 0,
      status: "not_started",
    });
  }

  const libraryReferenceCount = intent.workflow?.libraryReferenceCount ?? 0;
  if (intent.workflow?.allowLibraryReference || libraryReferenceCount > 0) {
    const libraryRule = intent.workflow?.libraryReferenceCountRule ?? "exact";
    items.push({
      id: "library_reference",
      label: formatCountLabel("ライブラリ参照", libraryReferenceCount || 1, libraryRule),
      category: libraryRule === "up_to" ? "optional" : "required",
      kind: "library_reference",
      targetCount: libraryReferenceCount || 1,
      completedCount: 0,
      status: "not_started",
    });
  }

  items.push({
    id: "finalize",
    label: "最終成果物を提出",
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
  return pendingRequests
    .filter((r) => r.status === "pending")
    .map((r) => ({
    requestId: r.id,
    taskId: r.taskId,
    actionId: r.actionId,
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
    return {
      ...item,
      completedCount: nextCompleted,
      status: nextCompleted >= target ? "done" : "in_progress",
    };
  });
}
