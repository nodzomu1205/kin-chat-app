import type {
  PendingExternalRequest,
  TaskRuntimeState,
} from "@/types/taskProtocol";
export { extractTaskProtocolEvents } from "@/lib/taskProtocolParser";
import {
  buildProtocolBlock,
  buildProtocolLine,
  buildProtocolSection,
} from "@/lib/protocolBlockBuilders";

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

  return buildProtocolBlock({
    name: "SYS_TASK_CONFIRM",
    lines: [
      buildProtocolLine("TASK_ID", runtime.currentTaskId),
      buildProtocolLine("STATUS", runtime.taskStatus.toUpperCase()),
      buildProtocolLine(
        "SUMMARY",
        note.trim() ||
          runtime.latestSummary ||
          runtime.currentTaskIntent?.goal ||
          runtime.currentTaskTitle
      ),
      ...buildProtocolSection("PROGRESS:", progressLines),
      ...buildProtocolSection("PENDING_REQUESTS:", pendingLines),
    ],
  });
}

export function buildWaitingAckBlock(request: PendingExternalRequest): string {
  return buildProtocolBlock({
    name: "SYS_TASK_CONFIRM",
    lines: [
      buildProtocolLine("TASK_ID", request.taskId),
      buildProtocolLine("ACTION_ID", request.actionId),
      buildProtocolLine("STATUS", "WAITING_USER_RESPONSE"),
      buildProtocolLine(
        "SUMMARY",
        `${request.id} was received. Waiting for the user's reply. Continue any other work that can proceed in parallel.`
      ),
    ],
  });
}

export function buildTaskSuspendBlock(
  runtime: TaskRuntimeState,
  note = ""
): string | null {
  if (!runtime.currentTaskId) return null;

  return buildProtocolBlock({
    name: "SYS_TASK_CONFIRM",
    lines: [
      buildProtocolLine("TASK_ID", runtime.currentTaskId),
      buildProtocolLine("STATUS", "SUSPENDED"),
      buildProtocolLine(
        "SUMMARY",
        note.trim() ||
          runtime.latestSummary ||
          runtime.currentTaskIntent?.goal ||
          runtime.currentTaskTitle ||
          "Suspend this task for now and keep the current progress for later resume."
      ),
      buildProtocolLine(
        "BODY",
        "Hold this task without discarding current progress. Resume after the blocking condition is resolved."
      ),
    ],
  });
}

export function buildUserResponseBlock(params: {
  taskId: string;
  actionId: string;
  body: string;
}) {
  return buildProtocolBlock({
    name: "SYS_USER_RESPONSE",
    lines: [
      buildProtocolLine("TASK_ID", params.taskId),
      buildProtocolLine("ACTION_ID", params.actionId),
      buildProtocolLine("BODY", params.body),
    ],
  });
}

export function buildLimitExceededBlock(params: {
  taskId: string;
  actionId?: string;
  summary: string;
}) {
  return buildProtocolBlock({
    name: "SYS_TASK_CONFIRM",
    lines: [
      buildProtocolLine("TASK_ID", params.taskId),
      ...(params.actionId
        ? [buildProtocolLine("ACTION_ID", params.actionId)]
        : []),
      buildProtocolLine("STATUS", "REJECTED_LIMIT"),
      buildProtocolLine("SUMMARY", params.summary),
    ],
  });
}

export function buildProgressAckResponseBlock(params: { taskId: string }) {
  return buildProtocolBlock({
    name: "SYS_GPT_RESPONSE",
    lines: [
      buildProtocolLine("TASK_ID", params.taskId),
      buildProtocolLine("ACTION_ID", "PROGRESS_ACK"),
      buildProtocolLine("BODY", "Noted. Continue the work."),
    ],
  });
}

export function buildResendLastMessageBlock(params?: { taskId?: string }) {
  return buildProtocolBlock({
    name: "SYS_GPT_RESPONSE",
    lines: [
      ...(params?.taskId ? [buildProtocolLine("TASK_ID", params.taskId)] : []),
      buildProtocolLine("ACTION_ID", "RESEND_LAST_MESSAGE"),
      buildProtocolLine(
        "BODY",
        "The last message didn't successfully come through. Resend the message. If your message is over 600 characters, split it into 600-700 character parts labeled as PART n/total, and clearly mark the final part."
      ),
    ],
  });
}

export function buildYoutubeTranscriptRetryBlock(params: {
  taskId?: string;
  actionId?: string;
  url?: string;
}) {
  return buildProtocolBlock({
    name: "SYS_GPT_RESPONSE",
    lines: [
      ...(params.taskId ? [buildProtocolLine("TASK_ID", params.taskId)] : []),
      buildProtocolLine(
        "ACTION_ID",
        params.actionId || "YOUTUBE_TRANSCRIPT_RETRY"
      ),
      buildProtocolLine(
        "BODY",
        "The requested YouTube transcript could not be fetched because the URL was invalid or did not lead to a usable transcript. Request a new YouTube search if needed, identify the correct video URL, and retry with a valid YouTube link."
      ),
      ...(params.url
        ? [buildProtocolLine("DETAIL", `Failed URL: ${params.url}`)]
        : []),
    ],
  });
}
