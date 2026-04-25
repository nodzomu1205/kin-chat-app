import type { TaskIntent } from "@/types/taskProtocol";
import {
  buildConstraints,
  buildDeliveryLimits,
  buildEventExampleBlocks,
  buildRuleLines,
} from "@/lib/task/taskCompilerSections";

export function compileKinTaskPrompt(params: {
  taskId: string;
  title?: string;
  originalInstruction?: string;
  intent: TaskIntent;
}): string {
  const { taskId, title, intent } = params;

  const deliveryLimits = buildDeliveryLimits(intent);
  const ruleLines = buildRuleLines(intent);
  const eventExampleBlocks = buildEventExampleBlocks(taskId, intent);
  const constraints = buildConstraints(intent);

  return `<<SYS_TASK>>
#${taskId}
${title?.trim() ? `TITLE: ${title.trim()}\n` : ""}GOAL:
${intent.goal}

OUTPUT_TYPE: ${intent.output.type}
OUTPUT_LANGUAGE: ${intent.output.language ?? "ja"}
FINALIZATION_POLICY: ${intent.workflow?.finalizationPolicy ?? "auto_when_ready"}

CONSTRAINTS:
${constraints.join("\n")}

DELIVERY_LIMITS:
${deliveryLimits.join("\n")}

RULES:
${ruleLines.join("\n")}

EVENT_FORMAT_EXAMPLES:
${eventExampleBlocks.join("\n\n")}
<<END_SYS_TASK>>`;
}
