import { NextResponse } from "next/server";
import { handleYouTubeTranscriptRoute } from "@/lib/server/youtubeTranscript/routeHandlers";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as unknown;
    return handleYouTubeTranscriptRoute(body);
  } catch (error) {
    console.error("youtube transcript route error:", error);
    return NextResponse.json(
      { error: "youtube transcript fetch failed" },
      { status: 500 }
    );
  }
}
