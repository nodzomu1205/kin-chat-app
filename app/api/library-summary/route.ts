import { NextRequest, NextResponse } from "next/server";
import { callOpenAIResponses } from "@/lib/server/chatgpt/openaiClient";

type SummaryRequest = {
  title?: string;
  text?: string;
};

function buildLibrarySummaryPrompt(args: { title: string; text: string }) {
  return [
    {
      role: "system",
      content:
        "You write concise, faithful library summaries. Summarize the whole document, not just the beginning. Return summary text only, in the same language as the document when possible. Aim for 2-4 sentences and keep it clearly shorter than the source.",
    },
    {
      role: "user",
      content: `TITLE:\n${args.title}\n\nDOCUMENT:\n${args.text}`,
    },
  ];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SummaryRequest;
    const title = body.title?.trim() || "Imported document";
    const text = body.text?.trim() || "";

    if (!text) {
      return NextResponse.json(
        { error: "Missing document text." },
        { status: 400 }
      );
    }

    const { text: summary, usage } = await callOpenAIResponses(
      {
        model: "gpt-4o-mini",
        input: buildLibrarySummaryPrompt({ title, text }),
      },
      "Summary could not be generated."
    );

    return NextResponse.json({
      summary: summary.trim(),
      usage,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Summary generation failed.",
      },
      { status: 500 }
    );
  }
}
