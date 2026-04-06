import type { TaskIntent } from "@/types/taskProtocol";

function buildCompletionCriteria(intent: TaskIntent): string[] {
  const lines = [
    `- Deliver one final ${intent.output.type} for the user in ${intent.output.language ?? "ja"}.`,
    "- Do not finish until the final user-facing output is ready.",
  ];

  if (intent.output.type === "presentation") {
    lines.unshift("- Produce a persuasive presentation-style piece as the final deliverable.");
  }

  return lines;
}

function buildRequiredWorkflow(intent: TaskIntent): string[] {
  const lines: string[] = [];

  if ((intent.workflow?.askGptCount ?? 0) > 0) {
    lines.push(`- Ask GPT at least ${intent.workflow?.askGptCount} times before finalizing.`);
  }

  lines.push("- Report progress with <<SYS_TASK_PROGRESS>> when the task state changes.");

  return lines;
}

function buildOptionalWorkflow(intent: TaskIntent): string[] {
  const lines: string[] = [];

  if ((intent.workflow?.askUserCount ?? 0) > 0) {
    lines.push(`- You may ask the user up to ${intent.workflow?.askUserCount} time(s).`);
  }

  if (intent.workflow?.allowMaterialRequest) {
    lines.push("- You may request extra materials from the user if needed.");
  }

  if (intent.workflow?.allowSearchRequest) {
    lines.push("- You may request web search support if the task needs outside facts.");
  }

  if (lines.length === 0) {
    lines.push("- No optional workflow steps were explicitly requested.");
  }

  return lines;
}

function buildDeliveryLimits(intent: TaskIntent): string[] {
  const lines = [
    "- Keep each outgoing message at or under 3600 characters.",
    "- If a single message would exceed 3200 characters, split it into multiple parts.",
    "- When splitting, label each part as PART n/total.",
    "- The final part must clearly say it is the last part.",
    "- Do not exceed 3 parts for one deliverable unless absolutely necessary.",
  ];

  if (intent.output.type === "presentation") {
    lines.push("- Prefer a compact, high-impact presentation style before using multi-part output.");
  }

  return lines;
}

export function compileKinTaskPrompt(params: {
  taskId: string;
  title: string;
  originalInstruction: string;
  intent: TaskIntent;
}): string {
  const { taskId, title, originalInstruction, intent } = params;

  const completionCriteria = buildCompletionCriteria(intent);
  const requiredWorkflow = buildRequiredWorkflow(intent);
  const optionalWorkflow = buildOptionalWorkflow(intent);
  const deliveryLimits = buildDeliveryLimits(intent);
  const constraints = intent.constraints?.length
    ? intent.constraints.map((item) => `- ${item}`)
    : ["- No extra constraints specified."];

  return `<<SYS_TASK>>
#${taskId}
TITLE: ${title}
GOAL:
${intent.goal}

ORIGINAL_INSTRUCTION:
${originalInstruction}

OUTPUT_TYPE: ${intent.output.type}
OUTPUT_LANGUAGE: ${intent.output.language ?? "ja"}
FINALIZATION_POLICY: ${intent.workflow?.finalizationPolicy ?? "auto_when_ready"}

COMPLETION_CRITERIA:
${completionCriteria.join("\n")}

REQUIRED_WORKFLOW:
${requiredWorkflow.join("\n")}

OPTIONAL_WORKFLOW:
${optionalWorkflow.join("\n")}

DELIVERY_LIMITS:
${deliveryLimits.join("\n")}

CONSTRAINTS:
${constraints.join("\n")}

RULES:
- Use ACTION_ID for every request or dependency you create.
- Use <<SYS_TASK_PROGRESS>> ... <<END_SYS_TASK_PROGRESS>> for progress updates.
- Use <<SYS_USER_QUESTION>> for questions to the user.
- Use <<SYS_MATERIAL_REQUEST>> for material requests to the user.
- Use <<SYS_ASK_GPT>> for GPT support requests.
- Use <<SYS_TASK_DONE>> only when completion criteria are satisfied.
- If waiting for a user reply, say so clearly, but continue any other parallelizable work.
- Do not output the final deliverable until required workflow steps are satisfied.
- Respect DELIVERY_LIMITS for every user-facing output.

EVENT_FORMAT_EXAMPLES:
<<SYS_TASK_PROGRESS>>
TASK_ID: ${taskId}
STATUS: IN_PROGRESS
SUMMARY: Brief progress update here.
<<END_SYS_TASK_PROGRESS>>

<<SYS_USER_QUESTION>>
TASK_ID: ${taskId}
ACTION_ID: A001
REQUIRED: YES
BODY: Ask the user a concrete question here.
<<END_SYS_USER_QUESTION>>

<<SYS_MATERIAL_REQUEST>>
TASK_ID: ${taskId}
ACTION_ID: A002
REQUIRED: NO
BODY: Request a concrete document or source here.
<<END_SYS_MATERIAL_REQUEST>>

<<SYS_ASK_GPT>>
TASK_ID: ${taskId}
ACTION_ID: A003
BODY: Ask GPT for a bounded support task here.
<<END_SYS_ASK_GPT>>

<<SYS_TASK_DONE>>
TASK_ID: ${taskId}
STATUS: DONE
SUMMARY: Summarize what was completed here.
<<END_SYS_TASK_DONE>>
<<SYS_TASK_END>>`;
}
