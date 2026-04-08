import type { TaskCountRule, TaskIntent } from "@/types/taskProtocol";

function buildRuleLines(intent: TaskIntent): string[] {
  const lines = [
    "- Use ACTION_ID for every request or dependency you create.",
    "- Use <<SYS_TASK_PROGRESS>> ... <<END_SYS_TASK_PROGRESS>> for progress updates.",
  ];

  if ((intent.workflow?.askUserCount ?? 0) > 0) {
    lines.push("- Use <<SYS_USER_QUESTION>> for questions to the user.");
    lines.push(
      "- The user or GPT may answer <<SYS_USER_QUESTION>> with <<SYS_USER_RESPONSE>> using the same TASK_ID and ACTION_ID."
    );
  }

  if (intent.workflow?.allowMaterialRequest) {
    lines.push("- Use <<SYS_MATERIAL_REQUEST>> for material requests to the user.");
  }

  if ((intent.workflow?.askGptCount ?? 0) > 0) {
    lines.push("- Use <<SYS_ASK_GPT>> for GPT support requests.");
    lines.push(
      "- GPT should answer <<SYS_ASK_GPT>> with <<SYS_GPT_RESPONSE>> using the same TASK_ID and ACTION_ID."
    );
  }

  if (intent.workflow?.allowSearchRequest) {
    lines.push("- Use <<SYS_SEARCH_REQUEST>> when you want GPT to run a web search.");
    lines.push(
      "- GPT should answer <<SYS_SEARCH_REQUEST>> with <<SYS_SEARCH_RESPONSE>> using the same TASK_ID and ACTION_ID."
    );
  }

  lines.push("- Use <<SYS_TASK_DONE>> only when completion criteria are satisfied.");
  lines.push(
    "- If waiting for a user reply, say so clearly, but continue any other parallelizable work."
  );
  lines.push("- Do not output the final deliverable until required workflow steps are satisfied.");
  lines.push("- Respect DELIVERY_LIMITS for every user-facing output.");

  return lines;
}

function buildEventExampleBlocks(taskId: string, intent: TaskIntent): string[] {
  const blocks = [
    `<<SYS_TASK_PROGRESS>>
TASK_ID: ${taskId}
STATUS: IN_PROGRESS
SUMMARY: Brief progress update here.
<<END_SYS_TASK_PROGRESS>>`,
  ];

  if ((intent.workflow?.askUserCount ?? 0) > 0) {
    blocks.push(`<<SYS_USER_QUESTION>>
TASK_ID: ${taskId}
ACTION_ID: A001
REQUIRED: YES
BODY: Ask the user a concrete question here.
<<END_SYS_USER_QUESTION>>`);

    blocks.push(`<<SYS_USER_RESPONSE>>
TASK_ID: ${taskId}
ACTION_ID: A001
BODY: User's answer to that question here.
<<END_SYS_USER_RESPONSE>>`);
  }

  if (intent.workflow?.allowMaterialRequest) {
    blocks.push(`<<SYS_MATERIAL_REQUEST>>
TASK_ID: ${taskId}
ACTION_ID: A002
REQUIRED: NO
BODY: Request a concrete document or source here.
<<END_SYS_MATERIAL_REQUEST>>`);
  }

  if ((intent.workflow?.askGptCount ?? 0) > 0) {
    blocks.push(`<<SYS_ASK_GPT>>
TASK_ID: ${taskId}
ACTION_ID: A003
BODY: Ask GPT for a bounded support task here.
<<END_SYS_ASK_GPT>>`);

    blocks.push(`<<SYS_GPT_RESPONSE>>
TASK_ID: ${taskId}
ACTION_ID: A003
BODY: GPT's bounded answer here.
<<END_SYS_GPT_RESPONSE>>`);
  }

  if (intent.workflow?.allowSearchRequest) {
    blocks.push(`<<SYS_SEARCH_REQUEST>>
TASK_ID: ${taskId}
ACTION_ID: S001
QUERY: Example search query here.
SEARCH_GOAL: Explain what outside facts you want.
OUTPUT_MODE: summary | summary_plus_raw
<<END_SYS_SEARCH_REQUEST>>`);

    blocks.push(`<<SYS_SEARCH_RESPONSE>>
TASK_ID: ${taskId}
ACTION_ID: S001
QUERY: Example search query here.
OUTPUT_MODE: summary
SUMMARY: Short search digest here.
RAW_RESULT_AVAILABLE: YES
RAW_RESULT_ID: RAW-${taskId}-S001-001
<<END_SYS_SEARCH_RESPONSE>>`);

    blocks.push(`<<SYS_SEARCH_RESPONSE>>
TASK_ID: ${taskId}
ACTION_ID: S002
QUERY: Example search query here.
OUTPUT_MODE: summary_plus_raw
SUMMARY: Short search digest here.
RAW_EXCERPT: Key raw evidence excerpt here.
RAW_RESULT_AVAILABLE: YES
RAW_RESULT_ID: RAW-${taskId}-S002-001
<<END_SYS_SEARCH_RESPONSE>>`);
  }

  blocks.push(`<<SYS_TASK_DONE>>
TASK_ID: ${taskId}
STATUS: DONE
SUMMARY: Summarize what was completed here.
<<END_SYS_TASK_DONE>>`);

  return blocks;
}

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

function formatCountInstruction(prefix: string, count: number, rule: TaskCountRule) {
  switch (rule) {
    case "at_least":
      return `${prefix} at least ${count} time(s).`;
    case "up_to":
      return `${prefix} no more than ${count} time(s).`;
    case "around":
      return `${prefix} around ${count} time(s).`;
    case "exact":
    default:
      return `${prefix} exactly ${count} time(s).`;
  }
}

function formatOptionalCountInstruction(prefix: string, count: number, rule: TaskCountRule) {
  switch (rule) {
    case "at_least":
      return `- You should try to ${prefix.toLowerCase()} at least ${count} time(s) if needed.`;
    case "up_to":
      return `- You may ${prefix.toLowerCase()} up to ${count} time(s).`;
    case "around":
      return `- You may ${prefix.toLowerCase()} around ${count} time(s).`;
    case "exact":
    default:
      return `- You may ${prefix.toLowerCase()} exactly ${count} time(s).`;
  }
}

function buildRequiredWorkflow(intent: TaskIntent): string[] {
  const lines: string[] = [];

  if ((intent.workflow?.askGptCount ?? 0) > 0) {
    lines.push(
      `- ${formatCountInstruction(
        "Ask GPT",
        intent.workflow!.askGptCount!,
        intent.workflow?.askGptCountRule ?? "exact"
      ).replace(/\.$/, " before finalizing.")}`
    );
  }

  if ((intent.workflow?.searchRequestCount ?? 0) > 0) {
    const searchRule = intent.workflow?.searchRequestCountRule ?? "exact";
    if (searchRule !== "up_to") {
      lines.push(
        `- ${formatCountInstruction(
          "Request web search support",
          intent.workflow!.searchRequestCount!,
          searchRule
        )}`
      );
    }
  }

  lines.push("- Report progress with <<SYS_TASK_PROGRESS>> when the task state changes.");

  return lines;
}

function buildOptionalWorkflow(intent: TaskIntent): string[] {
  const lines: string[] = [];

  if ((intent.workflow?.askUserCount ?? 0) > 0) {
    lines.push(
      formatOptionalCountInstruction(
        "Ask the user",
        intent.workflow!.askUserCount!,
        intent.workflow?.askUserCountRule ?? "exact"
      )
    );
  }

  if (intent.workflow?.allowMaterialRequest) {
    lines.push("- You may request extra materials from the user if needed.");
  }

  if (intent.workflow?.allowSearchRequest) {
    const count = intent.workflow?.searchRequestCount ?? 0;
    const rule = intent.workflow?.searchRequestCountRule ?? "exact";
    if (count > 0 && rule === "up_to") {
      lines.push(`- You may request web search support up to ${count} time(s).`);
    } else if (count > 0 && rule === "around") {
      lines.push(`- You may request web search support around ${count} time(s).`);
    } else if (count === 0) {
      lines.push("- You may request web search support if the task needs outside facts.");
    }
  }

  if (lines.length === 0) {
    lines.push("- No optional workflow steps were explicitly requested.");
  }

  return lines;
}

function buildDeliveryLimits(intent: TaskIntent): string[] {
  const lines = [
    "- You may receive long GPT protocol messages in 3200-3600 character parts labeled as PART n/total.",
    "- Keep each outgoing message at or under 700 characters.",
    "- If a single outgoing message would exceed 700 characters, split it into 600-700 character parts before sending.",
    "- When splitting, label each part as PART n/total.",
    "- The final part must clearly say it is the last part.",
  ];

  if (intent.output.type === "presentation") {
    lines.push("- Prefer a compact, high-impact presentation style before using multi-part output.");
  }

  return lines;
}

export function compileKinTaskPrompt(params: {
  taskId: string;
  title: string;
  originalInstruction?: string;
  intent: TaskIntent;
}): string {
  const { taskId, title, intent } = params;

  const completionCriteria = buildCompletionCriteria(intent);
  const requiredWorkflow = buildRequiredWorkflow(intent);
  const optionalWorkflow = buildOptionalWorkflow(intent);
  const deliveryLimits = buildDeliveryLimits(intent);
  const ruleLines = buildRuleLines(intent);
  const eventExampleBlocks = buildEventExampleBlocks(taskId, intent);
  const constraints = intent.constraints?.length
    ? intent.constraints.map((item) => `- ${item}`)
    : ["- No extra constraints specified."];

  return `<<SYS_TASK>>
#${taskId}
TITLE: ${title}
GOAL:
${intent.goal}

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
${ruleLines.join("\n")}

EVENT_FORMAT_EXAMPLES:
${eventExampleBlocks.join("\n\n")}
<<SYS_TASK_END>>`;
}
