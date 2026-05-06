import { NextResponse } from "next/server";
import { callOpenAIResponses } from "@/lib/server/chatgpt/openaiClient";
import {
  buildTaskCompletionResponsesRequest,
  buildTaskResponsesRequest,
  buildTaskRouteResponse,
  completePresentationPlanSlideFrames,
  validatePresentationPlanCompleteness,
} from "@/lib/server/task/routeBuilders";
import { parseTaskResult } from "@/lib/task/taskParser";
import type { TaskRequest } from "@/types/task";

function resolveTask(body: { task?: unknown }): TaskRequest | null {
  return body.task && typeof body.task === "object"
    ? (body.task as TaskRequest)
    : null;
}

export async function handleTaskRoute(body: { task?: unknown }) {
  const task = resolveTask(body);

  if (!task) {
    return NextResponse.json({ error: "Missing task" }, { status: 400 });
  }

  const { text, usage } = await callOpenAIResponses(
    buildTaskResponsesRequest(task),
    ""
  );
  let finalText = text;
  let finalUsage = usage;
  let parsed = parseTaskResult(finalText);
  const incompletePlan = validatePresentationPlanCompleteness({ task, parsed });
  if (incompletePlan) {
    const completed = await callOpenAIResponses(
      buildTaskCompletionResponsesRequest({
        task,
        previousRaw: finalText,
        expectedBodySlideCount: incompletePlan.expectedBodySlideCount,
        actualBodySlideCount: incompletePlan.actualBodySlideCount,
      }),
      ""
    );
    finalText = completed.text;
    finalUsage = sumUsage(finalUsage, completed.usage);
    parsed = parseTaskResult(finalText);
    const stillIncomplete = validatePresentationPlanCompleteness({ task, parsed });
    if (stillIncomplete) {
      finalText = completePresentationPlanSlideFrames(finalText);
      parsed = parseTaskResult(finalText);
      const unrecoverable = validatePresentationPlanCompleteness({ task, parsed });
      if (unrecoverable) {
        throw new Error(unrecoverable.message);
      }
    }
  }

  return NextResponse.json(
    buildTaskRouteResponse({
      raw: finalText,
      parsed,
      usage: finalUsage,
    })
  );
}

function sumUsage(
  first: { inputTokens: number; outputTokens: number; totalTokens: number },
  second: { inputTokens: number; outputTokens: number; totalTokens: number }
) {
  return {
    inputTokens: first.inputTokens + second.inputTokens,
    outputTokens: first.outputTokens + second.outputTokens,
    totalTokens: first.totalTokens + second.totalTokens,
  };
}
