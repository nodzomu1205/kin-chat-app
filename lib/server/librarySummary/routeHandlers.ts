import { NextResponse } from "next/server";
import {
  buildLibrarySummarySuccessResponse,
  resolveLibrarySummaryRequest,
} from "@/lib/server/librarySummary/routeBuilders";
import { generateLibrarySummary } from "@/lib/server/librarySummary/summaryService";

export async function handleLibrarySummaryRoute(body: unknown) {
  const { title, text } = resolveLibrarySummaryRequest(body);

  if (!text) {
    return NextResponse.json(
      { error: "Missing document text." },
      { status: 400 }
    );
  }

  const { text: summary, usage } = await generateLibrarySummary({ title, text });

  return NextResponse.json(
    buildLibrarySummarySuccessResponse({
      summary,
      usage,
    })
  );
}
