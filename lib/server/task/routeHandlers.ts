import OpenAI from "openai";
import { NextResponse } from "next/server";
import { extractUsage } from "@/lib/server/chatgpt/openaiResponse";
import { parseTaskResult } from "@/lib/taskParser";
import type { TaskRequest } from "@/types/task";
import {
  buildTaskResponsesRequest,
  buildTaskRouteResponse,
} from "@/lib/server/task/routeBuilders";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

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

  const response = await client.responses.create(buildTaskResponsesRequest(task));
  const text = response.output_text || "";
  const parsed = parseTaskResult(text);

  return NextResponse.json(
    buildTaskRouteResponse({
      raw: text,
      parsed,
      usage: extractUsage(response),
    })
  );
}
