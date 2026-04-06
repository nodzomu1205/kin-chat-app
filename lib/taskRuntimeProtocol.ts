import type {
  PendingExternalRequest,
  TaskProtocolEvent,
  TaskRuntimeState,
} from "@/types/taskProtocol";

const BLOCK_REGEX = /<<SYS_([A-Z_]+)>>([\s\S]*?)<<END_SYS_\1>>/g;

function normalizeEventType(raw: string): TaskProtocolEvent["type"] | null {
  switch (raw) {
    case "TASK_PROGRESS":
      return "task_progress";
    case "ASK_GPT":
      return "ask_gpt";
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

export function extractTaskProtocolEvents(text: string): TaskProtocolEvent[] {
  if (!text.trim()) return [];

  const events: TaskProtocolEvent[] = [];

  for (const match of text.matchAll(BLOCK_REGEX)) {
    const blockType = normalizeEventType(match[1]);
    if (!blockType) continue;

    const fields = parseBlockFields(match[2] ?? "");
    const body = fields.BODY || fields.SUMMARY || "";

    events.push({
      type: blockType,
      taskId: fields.TASK_ID || undefined,
      actionId: fields.ACTION_ID || fields.REQUEST_ID || undefined,
      status: fields.STATUS || undefined,
      body,
      required: parseRequired(fields.REQUIRED),
      summary: fields.SUMMARY || undefined,
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
    `SUMMARY: ${request.id} を受領しました。ユーザー回答待ちです。ほかの進行可能な作業は継続してください。`,
    "<<END_SYS_TASK_CONFIRM>>",
  ].join("\n");
}
