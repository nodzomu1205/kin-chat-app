import { NextResponse } from "next/server";
import { handleKindroidRoute } from "@/lib/server/kindroid/routeHandlers";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { message?: unknown; kinId?: unknown };
    return handleKindroidRoute(body);
  } catch (error: unknown) {
    console.error("💥 Kindroid route parse error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kindroid通信失敗" },
      { status: 500 }
    );
  }
}
