import { NextRequest, NextResponse } from "next/server";
import { handleLibrarySummaryRoute } from "@/lib/server/librarySummary/routeHandlers";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as unknown;
    return handleLibrarySummaryRoute(body);
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
