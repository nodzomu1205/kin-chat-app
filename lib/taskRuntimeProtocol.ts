import type {
  PendingExternalRequest,
  TaskProtocolEvent,
  TaskRuntimeState,
} from "@/types/taskProtocol";

const BLOCK_REGEX = /<<SYS_([A-Z_]+)>>([\s\S]*?)<<END_SYS_\1>>/g;
const TASK_BLOCK_REGEX = /<<SYS_TASK>>[\s\S]*?<<SYS_TASK_END>>/g;
const INFO_BLOCK_REGEX = /<<SYS_INFO>>[\s\S]*?<<END_SYS_INFO>>/g;

function normalizeEventType(raw: string): TaskProtocolEvent["type"] | null {
  switch (raw) {
    case "TASK_PROGRESS":
      return "task_progress";
    case "ASK_GPT":
      return "ask_gpt";
    case "GPT_RESPONSE":
      return "gpt_response";
    case "SEARCH_REQUEST":
      return "search_request";
    case "SEARCH_RESPONSE":
      return "search_response";
    case "USER_QUESTION":
      return "user_question";
    case "MATERIAL_REQUEST":
      return "material_request";
    case "TASK_DONE":
      return "task_done";
    case "TASK_CONFIRM":
      return "task_confirm";
    default:
      return null;
  }
}

function parseBlockFields(body: string) {
  const fields: Record<string, string> = {};
  let currentKey = "";

  for (const rawLine of body.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trimEnd();
    const match = line.match(/^([A-Z_]+)\s*:\s*(.*)$/);
    if (match) {
      currentKey = match[1];
      fields[currentKey] = match[2].trim();
      continue;
    }

    if (currentKey) {
      fields[currentKey] = [fields[currentKey], line].filter(Boolean).join("\n").trim();
    }
  }

  return fields;
}

function parseRequired(value: string | undefined) {
  if (!value) return false;
  return /^(yes|true|required|1)$/i.test(value.trim());
}

function parseSearchOutputMode(value: string | undefined) {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "summary") return "summary";
  if (normalized === "raw") return "raw";
  if (
    normalized === "summary_plus_raw" ||
    normalized === "raw_and_summary" ||
    normalized === "summary_with_sources"
  ) {
    return "summary_plus_raw";
  }
  return undefined;
}

export function extractTaskProtocolEvents(text: string): TaskProtocolEvent[] {
  if (!text.trim()) return [];

  const events: TaskProtocolEvent[] = [];
  const sanitized = text
    .replace(TASK_BLOCK_REGEX, "")
    .replace(INFO_BLOCK_REGEX, "");

  for (const match of sanitized.matchAll(BLOCK_REGEX)) {
    const blockType = normalizeEventType(match[1]);
    if (!blockType) continue;

    const fields = parseBlockFields(match[2] ?? "");
    const body =
      fields.BODY || fields.SEARCH_GOAL || fields.SUMMARY || "";

    events.push({
      type: blockType,
      taskId: fields.TASK_ID || undefined,
      actionId: fields.ACTION_ID || fields.REQUEST_ID || undefined,
      status: fields.STATUS || undefined,
      body,
      required: parseRequired(fields.REQUIRED),
      summary: fields.SUMMARY || undefined,
      query: fields.QUERY || undefined,
      outputMode: parseSearchOutputMode(fields.OUTPUT_MODE),
      rawResultId: fields.RAW_RESULT_ID || undefined,
    });
  }

  return events;
}

export function buildTaskConfirmBlock(
  runtime: TaskRuntimeState,
  note = ""
): string | null {
  if (!runtime.currentTaskId) return null;

  const progressLines = runtime.requirementProgress.map((item) => {
    const target = typeof item.targetCount === "number" ? `/${item.targetCount}` : "";
    return `- ${item.kind}: ${item.completedCount ?? 0}${target} (${item.status})`;
  });

  const pendingLines = runtime.pendingRequests.length
    ? runtime.pendingRequests.map(
        (request) =>
          `- ${request.actionId} [${request.kind}] ${request.status}: ${request.body}`
      )
    : ["- none"];

  return [
    "<<SYS_TASK_CONFIRM>>",
    `TASK_ID: ${runtime.currentTaskId}`,
    `STATUS: ${runtime.taskStatus.toUpperCase()}`,
    `SUMMARY: ${note.trim() || runtime.latestSummary || runtime.currentTaskIntent?.goal || runtime.currentTaskTitle}`,
    "PROGRESS:",
    ...progressLines,
    "PENDING_REQUESTS:",
    ...pendingLines,
    "<<END_SYS_TASK_CONFIRM>>",
  ].join("\n");
}

export function buildWaitingAckBlock(request: PendingExternalRequest): string {
  return [
    "<<SYS_TASK_CONFIRM>>",
    `TASK_ID: ${request.taskId}`,
    `ACTION_ID: ${request.actionId}`,
    "STATUS: WAITING_USER_RESPONSE",
    `SUMMARY: ${request.id} was received. Waiting for the user's reply. Continue any other work that can proceed in parallel.`,
    "<<END_SYS_TASK_CONFIRM>>",
  ].join("\n");
}

export function buildUserResponseBlock(params: {
  taskId: string;
  actionId: string;
  body: string;
}) {
  return [
    "<<SYS_USER_RESPONSE>>",
    `TASK_ID: ${params.taskId}`,
    `ACTION_ID: ${params.actionId}`,
    `BODY: ${params.body}`,
    "<<END_SYS_USER_RESPONSE>>",
  ].join("\n");
}

export function buildLimitExceededBlock(params: {
  taskId: string;
  actionId?: string;
  summary: string;
}) {
  return [
    "<<SYS_TASK_CONFIRM>>",
    `TASK_ID: ${params.taskId}`,
    ...(params.actionId ? [`ACTION_ID: ${params.actionId}`] : []),
    "STATUS: REJECTED_LIMIT",
    `SUMMARY: ${params.summary}`,
    "<<END_SYS_TASK_CONFIRM>>",
  ].join("\n");
}
