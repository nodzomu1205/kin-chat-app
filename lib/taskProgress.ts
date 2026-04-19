import type {
  PendingExternalRequest,
  TaskIntent,
  TaskRequirementProgress,
  UserFacingTaskRequest,
} from "@/types/taskProtocol";

type ProgressKind = TaskRequirementProgress["kind"];
type ProgressRule = NonNullable<TaskRequirementProgress["rule"]>;

const SEARCH_PROGRESS_LABEL = "検索";
const GPT_PROGRESS_LABEL = "GPTへの依頼";
const USER_PROGRESS_LABEL = "ユーザー確認";
const MATERIAL_PROGRESS_LABEL = "資料依頼";
const TRANSCRIPT_PROGRESS_LABEL = "文字起こし取得";
const LIBRARY_PROGRESS_LABEL = "ライブラリ参照";
const FINALIZE_PROGRESS_LABEL = "最終成果物";

const AT_LEAST_KEYWORDS = [
  "at least",
  "minimum",
  "no less than",
  "not less than",
  "or more",
  "以上",
  "最低",
  "少なくとも",
];
const UP_TO_KEYWORDS = [
  "up to",
  "at most",
  "no more than",
  "not more than",
  "or less",
  "まで",
  "以内",
  "内",
];
const AROUND_KEYWORDS = ["around", "about", "approximately", "前後", "程度", "約", "くらい"];
const EXACT_KEYWORDS = ["exactly", "ちょうど", "ぴったり", "正確に"];

function buildRequirementProgressItem(params: {
  id: string;
  label: string;
  category: TaskRequirementProgress["category"];
  kind: ProgressKind;
  rule?: ProgressRule;
  targetCount?: number;
}): TaskRequirementProgress {
  return {
    id: params.id,
    label: params.label,
    category: params.category,
    kind: params.kind,
    rule: params.rule,
    targetCount: params.targetCount,
    completedCount: 0,
    status: "not_started",
  };
}

function normalizeConstraintText(text: string) {
  return text.normalize("NFKC").replace(/\s+/g, " ").trim();
}

function extractFirstPositiveNumber(text: string) {
  const match = text.match(/(\d+)/);
  return match?.[1] ? Number(match[1]) : undefined;
}

function includesAnyKeyword(text: string, keywords: string[]) {
  const lower = text.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}

function detectConstraintRule(
  text: string,
  fallbackRule: ProgressRule = "unknown"
): ProgressRule {
  const normalized = normalizeConstraintText(text).toLowerCase();

  if (includesAnyKeyword(normalized, AT_LEAST_KEYWORDS)) return "at_least";
  if (includesAnyKeyword(normalized, UP_TO_KEYWORDS)) return "up_to";
  if (includesAnyKeyword(normalized, AROUND_KEYWORDS)) return "around";
  if (includesAnyKeyword(normalized, EXACT_KEYWORDS)) return "exact";
  return fallbackRule;
}

function inferConstraintKind(text: string): ProgressKind | null {
  const normalized = normalizeConstraintText(text).toLowerCase();
  if (/final output|summari[sz]e|characters?|文字/.test(normalized)) {
    return "finalize";
  }
  if (/search|検索/.test(normalized)) return "search_request";
  if (/youtube|transcript|文字起こし/.test(normalized)) {
    return "youtube_transcript_request";
  }
  if (/library|ライブラリ/.test(normalized)) return "library_reference";
  if (/user|ユーザー/.test(normalized)) return "ask_user";
  if (/gpt|chatgpt/.test(normalized)) return "ask_gpt";
  return null;
}

function resolveConstraintCategory(
  kind: ProgressKind,
  rule: ProgressRule
): TaskRequirementProgress["category"] {
  if (kind === "finalize") return "required";
  return rule === "at_least" || rule === "exact" ? "required" : "optional";
}

function resolveConstraintLabel(kind: ProgressKind) {
  switch (kind) {
    case "ask_gpt":
      return GPT_PROGRESS_LABEL;
    case "ask_user":
      return USER_PROGRESS_LABEL;
    case "request_material":
      return MATERIAL_PROGRESS_LABEL;
    case "search_request":
      return SEARCH_PROGRESS_LABEL;
    case "youtube_transcript_request":
      return TRANSCRIPT_PROGRESS_LABEL;
    case "library_reference":
      return LIBRARY_PROGRESS_LABEL;
    case "finalize":
    default:
      return FINALIZE_PROGRESS_LABEL;
  }
}

function buildConstraintRequirement(text: string): TaskRequirementProgress | null {
  const kind = inferConstraintKind(text);
  if (!kind) return null;

  const rule = detectConstraintRule(text, kind === "finalize" ? "exact" : "unknown");
  const label = resolveConstraintLabel(kind);

  if (kind === "finalize") {
    return buildRequirementProgressItem({
      id: "finalize",
      label,
      category: resolveConstraintCategory(kind, rule),
      kind,
      rule,
      targetCount: 1,
    });
  }

  const targetCount = extractFirstPositiveNumber(text) ?? 1;
  return buildRequirementProgressItem({
    id: kind,
    label,
    category: resolveConstraintCategory(kind, rule),
    kind,
    rule,
    targetCount,
  });
}

function buildWorkflowFallbackRequirement(
  kind: Extract<
    ProgressKind,
    | "ask_gpt"
    | "ask_user"
    | "request_material"
    | "search_request"
    | "youtube_transcript_request"
    | "library_reference"
  >,
  count?: number,
  rule: ProgressRule = "up_to"
) {
  if (!count || count <= 0) return null;

  return buildRequirementProgressItem({
    id: kind,
    label: resolveConstraintLabel(kind),
    category: resolveConstraintCategory(kind, rule),
    kind,
    rule,
    targetCount: count,
  });
}

export function buildInitialRequirementProgress(
  intent: TaskIntent
): TaskRequirementProgress[] {
  const items: TaskRequirementProgress[] = [];
  const seenKinds = new Set<ProgressKind>();

  for (const constraint of intent.constraints || []) {
    const requirement = buildConstraintRequirement(constraint);
    if (!requirement || seenKinds.has(requirement.kind)) continue;
    seenKinds.add(requirement.kind);
    items.push(requirement);
  }

  const workflowFallbacks = [
    buildWorkflowFallbackRequirement(
      "ask_gpt",
      intent.workflow?.askGptCount,
      intent.workflow?.askGptCountRule ?? "up_to"
    ),
    buildWorkflowFallbackRequirement(
      "ask_user",
      intent.workflow?.askUserCount,
      intent.workflow?.askUserCountRule ?? "up_to"
    ),
    intent.workflow?.allowMaterialRequest
      ? buildRequirementProgressItem({
          id: "request_material",
          label: MATERIAL_PROGRESS_LABEL,
          category: "optional",
          kind: "request_material",
          rule: "up_to",
          targetCount: 1,
        })
      : null,
    buildWorkflowFallbackRequirement(
      "search_request",
      intent.workflow?.searchRequestCount ??
        (intent.workflow?.allowSearchRequest ? 1 : undefined),
      intent.workflow?.searchRequestCountRule ?? "up_to"
    ),
    buildWorkflowFallbackRequirement(
      "youtube_transcript_request",
      intent.workflow?.youtubeTranscriptRequestCount ??
        (intent.workflow?.allowYoutubeTranscriptRequest ? 1 : undefined),
      intent.workflow?.youtubeTranscriptRequestCountRule ?? "up_to"
    ),
    buildWorkflowFallbackRequirement(
      "library_reference",
      intent.workflow?.libraryReferenceCount ??
        (intent.workflow?.allowLibraryReference ? 1 : undefined),
      intent.workflow?.libraryReferenceCountRule ?? "up_to"
    ),
  ];

  for (const fallback of workflowFallbacks) {
    if (!fallback || seenKinds.has(fallback.kind)) continue;
    seenKinds.add(fallback.kind);
    items.push(fallback);
  }

  if (!seenKinds.has("finalize")) {
    items.push(
      buildRequirementProgressItem({
        id: "finalize",
        label: FINALIZE_PROGRESS_LABEL,
        category: "required",
        kind: "finalize",
        rule: "exact",
        targetCount: 1,
      })
    );
  }

  return items;
}

export function toUserFacingRequests(
  pendingRequests: PendingExternalRequest[]
): UserFacingTaskRequest[] {
  return pendingRequests
    .filter((request) => request.status === "pending")
    .map((request) => ({
      requestId: request.id,
      taskId: request.taskId,
      actionId: request.actionId,
      kind: request.kind,
      body: request.body,
      required: request.required,
      status: request.status,
      createdAt: request.createdAt,
      answeredAt: request.answeredAt,
      answerText: request.answerText,
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
