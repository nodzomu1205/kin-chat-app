import { NextResponse } from "next/server";
import { callOpenAIResponses } from "@/lib/server/chatgpt/openaiClient";
import { parseTaskResult } from "@/lib/taskParser";
import type { TaskRequest } from "@/types/task";
import {
  buildTaskResponsesRequest,
  buildTaskRouteResponse,
} from "@/lib/server/task/routeBuilders";

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
  const parsed = parseTaskResult(text);

  return NextResponse.json(
    buildTaskRouteResponse({
      raw: text,
      parsed,
      usage,
    })
  );
}
