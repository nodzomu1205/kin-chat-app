import type {
  PendingExternalRequest,
  TaskRuntimeState,
} from "@/types/taskProtocol";
export { extractTaskProtocolEvents } from "@/lib/taskProtocolParser";

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

export function buildTaskSuspendBlock(
  runtime: TaskRuntimeState,
  note = ""
): string | null {
  if (!runtime.currentTaskId) return null;

  return [
    "<<SYS_TASK_CONFIRM>>",
    `TASK_ID: ${runtime.currentTaskId}`,
    "STATUS: SUSPENDED",
    `SUMMARY: ${
      note.trim() ||
      runtime.latestSummary ||
      runtime.currentTaskIntent?.goal ||
      runtime.currentTaskTitle ||
      "Suspend this task for now and keep the current progress for later resume."
    }`,
    "BODY: Hold this task without discarding current progress. Resume after the blocking condition is resolved.",
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

export function buildProgressAckResponseBlock(params: { taskId: string }) {
  return [
    "<<SYS_GPT_RESPONSE>>",
    `TASK_ID: ${params.taskId}`,
    "ACTION_ID: PROGRESS_ACK",
    "BODY: Noted. Continue the work.",
    "<<END_SYS_GPT_RESPONSE>>",
  ].join("\n");
}

export function buildResendLastMessageBlock(params?: { taskId?: string }) {
  return [
    "<<SYS_GPT_RESPONSE>>",
    ...(params?.taskId ? [`TASK_ID: ${params.taskId}`] : []),
    "ACTION_ID: RESEND_LAST_MESSAGE",
    "BODY: The last message didn't successfully come through. Resend the message. If your message is over 600 characters, split it into 600-700 character parts labeled as PART n/total, and clearly mark the final part.",
    "<<END_SYS_GPT_RESPONSE>>",
  ].join("\n");
}

export function buildYoutubeTranscriptRetryBlock(params: {
  taskId?: string;
  actionId?: string;
  url?: string;
}) {
  return [
    "<<SYS_GPT_RESPONSE>>",
    ...(params.taskId ? [`TASK_ID: ${params.taskId}`] : []),
    `ACTION_ID: ${params.actionId || "YOUTUBE_TRANSCRIPT_RETRY"}`,
    "BODY: The requested YouTube transcript could not be fetched because the URL was invalid or did not lead to a usable transcript. Request a new YouTube search if needed, identify the correct video URL, and retry with a valid YouTube link.",
    ...(params.url ? [`DETAIL: Failed URL: ${params.url}`] : []),
    "<<END_SYS_GPT_RESPONSE>>",
  ].join("\n");
}
