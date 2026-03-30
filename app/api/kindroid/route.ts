import { NextResponse } from "next/server";

const KINDROID_TIMEOUT_MS = 45000;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, kinId } = body;

    if (!message || !kinId) {
      return NextResponse.json(
        { error: "message or kinId missing" },
        { status: 400 }
      );
    }

    if (!process.env.KINDROID_API_KEY) {
      return NextResponse.json(
        { error: "KINDROID_API_KEY not set" },
        { status: 500 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      KINDROID_TIMEOUT_MS
    );

    const response = await fetch("https://api.kindroid.ai/v1/send-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.KINDROID_API_KEY}`,
      },
      body: JSON.stringify({
        ai_id: kinId,
        message,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

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

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json({ reply: text });
    }

    const extractReply = (payload: any) => {
      return (
        payload.reply ??
        payload.response ??
        payload.text ??
        payload.message ??
        payload.messages?.[0]?.text ??
        payload.data?.text ??
        null
      );
    };

    const reply = extractReply(data) || "⚠️ 返答が見つかりません";

    return NextResponse.json({ reply });
  } catch (error: any) {
    if (error?.name === "AbortError") {
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
  }
}