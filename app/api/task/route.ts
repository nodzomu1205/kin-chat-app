import { NextRequest, NextResponse } from "next/server";
import { handleTaskRoute } from "@/lib/server/task/routeHandlers";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { task?: unknown };
    return handleTaskRoute(body);
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
