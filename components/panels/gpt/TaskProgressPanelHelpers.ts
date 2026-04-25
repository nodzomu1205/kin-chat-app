import type { TaskProgressView } from "@/components/panels/gpt/gptPanelTypes";

export function normalizeTaskStatusForOutput(
  status: TaskProgressView["taskStatus"]
) {
  if (
    status === "suspended" ||
    status === "waiting_material" ||
    status === "waiting_user"
  ) {
    return "READY_TO_RESUME";
  }
  if (status === "ready_to_resume") return "READY_TO_RESUME";
  if (status === "completed") return "COMPLETED";
  return "RUNNING";
}

export function buildTaskProgressOutput(view: TaskProgressView) {
  const progressLines = view.requirementProgress.length
    ? view.requirementProgress.map((item) => {
        const target =
          typeof item.targetCount === "number" ? `/${item.targetCount}` : "";
        const category = item.category === "required" ? "required" : "optional";
        return `- ${item.label}: ${item.completedCount ?? 0}${target} (${category}, ${item.status})`;
      })
    : ["- none"];

  const requestLines = view.userFacingRequests.length
    ? view.userFacingRequests.map(
        (request) =>
          `- ${request.actionId} [${request.kind}] ${request.status}: ${request.body}`
      )
    : ["- none"];

  return [
    "<<SYS_TASK_CONFIRM>>",
    `TASK_ID: ${view.taskId || ""}`,
    `STATUS: ${normalizeTaskStatusForOutput(view.taskStatus)}`,
    "SUMMARY: Progress counts were reviewed in the GPT task panel. Continue from this state and complete the task.",
    "PROGRESS:",
    ...progressLines,
    "PENDING_REQUESTS:",
    ...requestLines,
    "<<END_SYS_TASK_CONFIRM>>",
  ].join("\n");
}
