import { NextResponse } from "next/server";
import {
  handleChatRoute,
  handleMemoryInterpretRoute,
  handleCompactRecentRoute,
} from "@/lib/server/chatgpt/routeHandlers";
import { resolveChatRouteMode } from "@/lib/server/chatgpt/requestNormalization";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const mode = resolveChatRouteMode(body);

    if (mode === "chat") {
      return handleChatRoute(body);
    }

    if (mode === "compact_recent") {
      return handleCompactRecentRoute(body);
    }

    if (mode === "memory_interpret") {
      return handleMemoryInterpretRoute(body);
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (e) {
    console.error("chatgpt route error:", e);
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "ChatGPT error",
      },
      { status: 500 }
    );
  }
}

