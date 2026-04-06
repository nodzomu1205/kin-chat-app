import type { ChatBridgeSettings, TaskRuntimeState } from "@/types/taskProtocol";

export function shouldInjectTaskContext(params: {
  userInput: string;
  settings: ChatBridgeSettings;
}) {
  if (params.settings.alwaysShowCurrentTaskInChatContext) return true;
  if (!params.settings.injectTaskContextOnReference) return false;

  return /これ|このタスク|この内容|さっきの案|今の整理|この方針/.test(
    params.userInput.trim()
  );
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
