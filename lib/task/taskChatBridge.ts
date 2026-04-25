import type { ChatBridgeSettings, TaskRuntimeState } from "@/types/taskProtocol";

const TASK_REFERENCE_RE =
  /(?:このタスク|そのタスク|現在のタスク|タスク文脈|タスク内容|この件|その件|この内容|その内容|続き|続けて|前のタスク|さっきのタスク|current task|this task|that task|task context|continue the task)/i;

export function shouldInjectTaskContext(params: {
  userInput: string;
  settings: ChatBridgeSettings;
}) {
  if (params.settings.alwaysShowCurrentTaskInChatContext) return true;
  if (!params.settings.injectTaskContextOnReference) return false;

  return TASK_REFERENCE_RE.test(params.userInput.trim());
}

export function buildTaskChatBridgeContext(runtime: TaskRuntimeState) {
  const pendingSummary = runtime.pendingRequests
    .filter((r) => r.status === "pending")
    .map((r) => `- [${r.target}] ${r.actionId}: ${r.body}`)
    .join("\n");

  return [
    "[Current Task Context]",
    `Task ID: ${runtime.currentTaskId ?? ""}`,
    `Title: ${runtime.currentTaskTitle ?? ""}`,
    `Goal: ${runtime.currentTaskIntent?.goal ?? ""}`,
    `Status: ${runtime.taskStatus ?? ""}`,
    runtime.latestSummary ? `Latest Summary: ${runtime.latestSummary}` : "",
    pendingSummary ? `Pending:\n${pendingSummary}` : "",
    "[/Current Task Context]",
  ]
    .filter(Boolean)
    .join("\n");
}
