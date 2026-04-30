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

function buildPresentationPlanTaskPrompt(task: TaskRequest) {
  return [
    "<<SYS_PRESENTATION_PLAN_TASK>>",
    `TYPE: ${task.type}`,
    `TASK_ID: ${task.taskId}`,
    `GOAL: ${task.goal}`,
    `INPUT_REF: ${task.inputRef}`,
    "INPUT:",
    task.inputSummary,
    "CONSTRAINTS:",
    buildConstraintSection(task),
    "<<END_SYS_PRESENTATION_PLAN_TASK>>",
    "",
    "Return only one valid JSON object. Do not return markdown. Do not wrap it in ```.",
    "The JSON object must follow this exact top-level shape:",
    JSON.stringify({
      taskId: task.taskId,
      type: task.type,
      status: "OK",
      summary: "自然文の概要",
      extractedItems: ["自然文の抽出事項"],
      strategyItems: ["audience: ...", "purpose: ..."],
      keyMessages: ["スライドごとの主張文"],
      slideDesign: {
        slides: [
          {
            slideNumber: 1,
            placementComposition: "上部にタイトル、中央に図、下部に狙い",
            parts: [
              { role: "タイトル", text: "実際に表示するタイトル" },
              { role: "狙い", text: "実際に表示する短文" },
            ],
          },
        ],
      },
      warnings: [],
      missingInfo: [],
      nextSuggestion: [],
    }),
    "",
    "Rules:",
    "- summary, extractedItems, strategyItems, and keyMessages may be rich Japanese natural-language strings.",
    "- slideDesign is the source of truth for every slide. It must not be empty when enough input material exists.",
    "- Each slideDesign.slides item must contain slideNumber, placementComposition, and parts.",
    "- Each part must contain role and text. Do not combine multiple roles in one text.",
    "- Every element mentioned in placementComposition must appear as a concrete part.",
    "- If slideDesign cannot be created, set status to NEEDS_MORE and explain the reason in missingInfo.",
  ].join("\n");
}

export function buildTaskPrompt(task: TaskRequest): string {
  if (task.type === "FORMAT_TASK") return buildFormatTaskPrompt(task);
  if (task.outputFormat === "presentation_plan") {
    return buildPresentationPlanTaskPrompt(task);
  }
  return buildWorkTaskPrompt(task);
}
