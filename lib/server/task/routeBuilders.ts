import { buildTaskPrompt } from "@/lib/taskProtocol";
import type { TaskResult, TaskRequest } from "@/types/task";
import type { UsageSummary } from "@/lib/server/chatgpt/openaiResponse";

export const TASK_ROUTE_MODEL = "gpt-4.1-mini";

export function buildTaskResponsesRequest(task: TaskRequest) {
  return {
    model: TASK_ROUTE_MODEL,
    input: buildTaskPrompt(task),
  };
}

export function buildTaskRouteResponse(args: {
  raw: string;
  parsed: TaskResult | null;
  usage: UsageSummary;
}) {
  return {
    raw: args.raw,
    parsed: args.parsed,
    usage: args.usage,
  };
}
