import { NextResponse } from "next/server";
import {
  buildKindroidRequestInit,
  buildKindroidSuccessPayload,
  KINDROID_API_URL,
  KINDROID_TIMEOUT_MS,
  type KindroidRequestBody,
} from "@/lib/server/kindroid/routeBuilders";

function resolveKindroidRequest(body: {
  message?: unknown;
  kinId?: unknown;
}): KindroidRequestBody {
  return {
    message: typeof body.message === "string" ? body.message : undefined,
    kinId: typeof body.kinId === "string" ? body.kinId : undefined,
  };
}

export async function handleKindroidRoute(body: {
  message?: unknown;
  kinId?: unknown;
}) {
  const { message, kinId } = resolveKindroidRequest(body);

  if (!message || !kinId) {
    return NextResponse.json(
      { error: "message or kinId missing" },
      { status: 400 }
    );
  }

  const apiKey = process.env.KINDROID_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "KINDROID_API_KEY not set" },
      { status: 500 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), KINDROID_TIMEOUT_MS);

  try {
    const response = await fetch(
      KINDROID_API_URL,
      buildKindroidRequestInit({
        apiKey,
        kinId,
        message,
        signal: controller.signal,
      })
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error("❌ Kindroid API error:", response.status, errorText);

      return NextResponse.json(
        {
          error: "Kindroid API error",
          detail: errorText,
        },
        { status: response.status }
      );
    }

    const text = await response.text();
    return NextResponse.json(buildKindroidSuccessPayload(text));
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error(`⏱ Kindroid timeout after ${KINDROID_TIMEOUT_MS}ms`);

      return NextResponse.json(
        {
          error: "Kindroidの応答待ちがタイムアウトしました",
          timeoutMs: KINDROID_TIMEOUT_MS,
        },
        { status: 504 }
      );
    }

    console.error("💥 Kindroid APIエラー:", error);

    return NextResponse.json(
      { error: "Kindroid通信失敗" },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
