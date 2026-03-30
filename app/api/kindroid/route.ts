import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, kinId } = body;

    // =========================
    // 入力チェック
    // =========================
    if (!message || !kinId) {
      return NextResponse.json(
        { error: "message or kinId missing" },
        { status: 400 }
      );
    }

    // =========================
    // APIキー確認
    // =========================
    if (!process.env.KINDROID_API_KEY) {
      return NextResponse.json(
        { error: "KINDROID_API_KEY not set" },
        { status: 500 }
      );
    }

    // =========================
    // タイムアウト設定
    // =========================
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    // =========================
    // Kindroid API 呼び出し
    // =========================
    const response = await fetch("https://api.kindroid.ai/v1/send-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.KINDROID_API_KEY}`,
      },
      body: JSON.stringify({
        ai_id: kinId,
        message: message,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // =========================
    // エラーハンドリング
    // =========================
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

    // =========================
    // レスポンス処理
    // =========================
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // JSONじゃない場合はそのまま返す
      return NextResponse.json({ reply: text });
    }

    // =========================
    // reply抽出
    // =========================
    const extractReply = (data: any) => {
      return (
        data.reply ??
        data.response ??
        data.text ??
        data.message ??
        data.messages?.[0]?.text ??
        data.data?.text ??
        null
      );
    };

    const reply = extractReply(data) || "⚠️ 返答が見つかりません";

    return NextResponse.json({ reply });

  } catch (error: any) {
    // =========================
    // タイムアウト処理
    // =========================
    if (error.name === "AbortError") {
      console.error("⏱ Kindroid timeout");
      return NextResponse.json(
        { error: "Kindroid timeout" },
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