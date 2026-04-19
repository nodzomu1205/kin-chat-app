import { TaskRequest } from "@/types/task";

function buildConstraintSection(task: TaskRequest) {
  return task.constraints.length > 0
    ? task.constraints.map((constraint) => `- ${constraint}`).join("\n")
    : "- None";
}

function buildFormatTaskPrompt(task: TaskRequest) {
  const titleLine =
    task.existingTitle && task.existingTitle.trim()
      ? `EXISTING_TITLE: ${task.existingTitle.trim()}`
      : "EXISTING_TITLE: (none)";

  return [
    "<<SYS_FORMAT_TASK>>",
    `TASK_ID: ${task.taskId}`,
    titleLine,
    `GOAL: ${task.goal}`,
    `INPUT_REF: ${task.inputRef}`,
    "INPUT:",
    task.inputSummary,
    "CONSTRAINTS:",
    buildConstraintSection(task),
    "<<END_SYS_FORMAT_TASK>>",
    "",
    "Return only one <<TASK>> block.",
    "Use TITLE only when EXISTING_TITLE is provided.",
    "If EXISTING_TITLE is (none), omit the TITLE line.",
    "Do not create a new title.",
  ].join("\n");
}

function buildWorkTaskPrompt(task: TaskRequest) {
  return [
    "<<SYS_TASK>>",
    `TYPE: ${task.type}`,
    `TASK_ID: ${task.taskId}`,
    `GOAL: ${task.goal}`,
    `INPUT_REF: ${task.inputRef}`,
    "INPUT:",
    task.inputSummary,
    "CONSTRAINTS:",
    buildConstraintSection(task),
    "<<END_SYS_TASK>>",
    "",
    "Return only this format:",
    "<<SYS_TASK_RESULT>>",
    `TASK_ID: ${task.taskId}`,
    `TYPE: ${task.type}`,
    "STATUS: OK | PARTIAL | NEEDS_MORE",
    "SUMMARY: ...",
    "KEY_POINTS:",
    "- ...",
    "DETAIL_BLOCKS:",
    "[BLOCK: ...]",
    "- ...",
    "WARNINGS:",
    "- ...",
    "MISSING_INFO:",
    "- ...",
    "NEXT_SUGGESTION:",
    "- ...",
    "<<END_SYS_TASK_RESULT>>",
  ].join("\n");
}

export function buildTaskPrompt(task: TaskRequest): string {
  return task.type === "FORMAT_TASK"
    ? buildFormatTaskPrompt(task)
    : buildWorkTaskPrompt(task);
}
