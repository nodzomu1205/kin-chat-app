import type { TaskIntent } from "@/types/taskProtocol";
import {
  buildCompletionCriteria,
  buildConstraints,
  buildDeliveryLimits,
  buildEventExampleBlocks,
  buildOptionalWorkflow,
  buildRequiredWorkflow,
  buildRuleLines,
} from "@/lib/taskCompilerSections";

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
  const constraints = buildConstraints(intent);

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
<<END_SYS_TASK>>`;
}
