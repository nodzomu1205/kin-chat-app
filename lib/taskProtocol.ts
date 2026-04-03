import { TaskRequest } from "@/types/task";

function buildGroundingRules(mode: TaskRequest["groundingMode"]): string {
  switch (mode) {
    case "CREATIVE":
      return `
Important rules:
- You may propose reasonable hypotheses when information is incomplete.
- Clearly label any hypothesis or inference.
- Do not present invented details as confirmed facts.
- Separate explicit information from inferred suggestions.
`;

    case "BALANCED":
      return `
Important rules:
- Prefer information explicitly contained in the input.
- If a small inference is unavoidable, label it clearly as inference.
- Do not invent specific facts, figures, competitors, prices, filenames, or evidence not present in the input.
- If information is missing, say it is missing.
`;

    case "STRICT":
    default:
      return `
Important rules:
- Use only information explicitly contained in the input.
- Do not invent facts, figures, competitors, prices, filenames, code structures, or evidence not present in the input.
- If information is missing, say it is missing.
- If inference would be required, do not guess; instead state that the input is insufficient.
- Prefer omission over fabrication.
`;
  }
}

export function buildTaskPrompt(task: TaskRequest): string {
  const groundingMode = task.groundingMode ?? "STRICT";
  const groundingRules = buildGroundingRules(groundingMode);

  if (task.type === "FORMAT_TASK") {
    return `
<<SYS_TASK>>
TYPE: ${task.type}
TASK_ID: ${task.taskId}
DATA_KIND: ${task.dataKind}
GOAL: ${task.goal}
INPUT_REF: ${task.inputRef}
INPUT_SUMMARY: ${task.inputSummary}
CONSTRAINTS:
${task.constraints.map((c) => `- ${c}`).join("\n")}
OUTPUT_FORMAT: ${task.outputFormat}
PRIORITY: ${task.priority}
VISIBILITY: ${task.visibility}
RESPONSE_MODE: ${task.responseMode}
GROUNDING_MODE: ${groundingMode}
<<END_SYS_TASK>>

You are a structured task formatter for Kin execution.
${groundingRules}

Return ONLY one executable task block in the exact format below.
All meta headers and structural labels must be in English.
Natural-language detail lines may be in Japanese if the source content is Japanese.
Do not add any explanation before or after the block.

<<TASK>>
TITLE: ...
GOAL:
- ...
CONTEXT:
- ...
INPUT:
- ...
CONSTRAINTS:
- ...
TODO:
1. ...
2. ...
3. ...
IF_MISSING:
- ...
OUTPUT:
- ...
<<END_TASK>>
`;
  }

  return `
<<SYS_TASK>>
TYPE: ${task.type}
TASK_ID: ${task.taskId}
DATA_KIND: ${task.dataKind}
GOAL: ${task.goal}
INPUT_REF: ${task.inputRef}
INPUT_SUMMARY: ${task.inputSummary}
CONSTRAINTS:
${task.constraints.map((c) => `- ${c}`).join("\n")}
OUTPUT_FORMAT: ${task.outputFormat}
PRIORITY: ${task.priority}
VISIBILITY: ${task.visibility}
RESPONSE_MODE: ${task.responseMode}
GROUNDING_MODE: ${groundingMode}
<<END_SYS_TASK>>

You are a structured cognitive engine.
${groundingRules}
Return ONLY in the following format:

<<SYS_TASK_RESULT>>
TASK_ID: ${task.taskId}
TYPE: ${task.type}
STATUS: OK | PARTIAL | NEEDS_MORE
SUMMARY: ...
KEY_POINTS:
- ...
DETAIL_BLOCKS:
[BLOCK: ...]
- ...
WARNINGS:
- ...
MISSING_INFO:
- ...
NEXT_SUGGESTION:
- ...
<<END_SYS_TASK_RESULT>>
`;
}