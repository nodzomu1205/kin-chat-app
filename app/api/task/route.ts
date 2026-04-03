import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { buildTaskPrompt } from "@/lib/taskProtocol";
import { parseTaskResult } from "@/lib/taskParser";
import { TaskRequest } from "@/types/task";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

function extractUsage(data: any) {
  const inputTokens =
    typeof data?.usage?.input_tokens === "number" ? data.usage.input_tokens : 0;

  const outputTokens =
    typeof data?.usage?.output_tokens === "number"
      ? data.usage.output_tokens
      : 0;

  const totalTokens =
    typeof data?.usage?.total_tokens === "number"
      ? data.usage.total_tokens
      : inputTokens + outputTokens;

  return {
    inputTokens,
    outputTokens,
    totalTokens,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const task: TaskRequest = body.task;

    if (!task) {
      return NextResponse.json({ error: "Missing task" }, { status: 400 });
    }

    const prompt = buildTaskPrompt(task);

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const text = response.output_text || "";
    const parsed = parseTaskResult(text);

    return NextResponse.json({
      raw: text,
      parsed,
      usage: extractUsage(response),
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}