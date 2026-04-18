import { NextResponse } from "next/server";
import { handleIngestRoute } from "@/lib/server/ingest/routeHandlers";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    return handleIngestRoute(form);
  } catch (error) {
    console.error("ingest route error", error);

    return NextResponse.json(
      { error: "ingest route failed" },
      { status: 500 }
    );
  }
}
