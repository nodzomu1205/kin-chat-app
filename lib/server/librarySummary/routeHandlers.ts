import { NextResponse } from "next/server";
import { callOpenAIResponses } from "@/lib/server/chatgpt/openaiClient";
import {
  buildLibrarySummaryPrompt,
  buildLibrarySummarySuccessResponse,
  resolveLibrarySummaryRequest,
} from "@/lib/server/librarySummary/routeBuilders";

export async function handleLibrarySummaryRoute(body: unknown) {
  const { title, text } = resolveLibrarySummaryRequest(body);

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

  return NextResponse.json(
    buildLibrarySummarySuccessResponse({
      summary,
      usage,
    })
  );
}
