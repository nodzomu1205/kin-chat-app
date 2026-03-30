import { NextResponse } from "next/server";
import { searchGoogle } from "@/lib/search";
import {
  createEmptyMemory,
  normalizeMemoryShape,
  safeParseMemory,
  memoryToPrompt,
} from "@/lib/memory";

// 🔍 検索コマンド解析
function parseSearchCommand(text: string) {
  if (!text) return null;

  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = line.match(/^検索[:：]\s*(.+)$/);

    if (match) {
      const query = match[1].trim();
      return query || null;
    }
  }

  return null;
}

function parsePolishInput(input: string) {
  const separator = /\n\s*---\s*\n/;
  const parts = input.split(separator);

  if (parts.length <= 1) {
    return {
      draft: input.trim(),
      request: "",
    };
  }

  return {
    draft: parts[0]?.trim() || "",
    request: parts.slice(1).join("\n---\n").trim(),
  };
}

type ChatMessage = {
  role: "user" | "gpt" | "kin" | "assistant";
  text: string;
};

type OpenAIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type InstructionMode =
  | "normal"
  | "translate_explain"
  | "reply_only"
  | "polish";

type UsageSummary = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

function extractUsage(data: any): UsageSummary {
  const inputTokens =
    typeof data?.usage?.input_tokens === "number" ? data.usage.input_tokens : 0;

  const outputTokens =
    typeof data?.usage?.output_tokens === "number"
      ? data.usage.output_tokens
      : 0;

  const totalTokens =
    typeof data?.usage?.total_tokens === "number"
      ? data.usage.total_tokens
      : inputTokens + outputTokens;

  return {
    inputTokens,
    outputTokens,
    totalTokens,
  };
}

function buildInstructionWrappedInput(
  input: string,
  instructionMode: InstructionMode
) {
  if (instructionMode === "translate_explain") {
    return `
以下のメッセージを処理してください。

やること:
1. メッセージを自然な日本語に翻訳する
2. 相手の意図・ニュアンス・温度感を簡潔に解説する
3. 最後に「返信案を作りますか？」と自然に問いかける

重要:
- 元のメッセージの言語を必ず判定して保持すること
- 返信案を作る場合は、その元の言語で作成する前提とする
- 最後の問いかけでは、可能なら具体的な言語名を自然に示してよい
  例: 「返信案を作りますか？（ロシア語で作成します）」

注意:
- 説明は分かりやすく簡潔にする
- 相手の言外の意図が読める場合はその可能性も示す
- まだ返信案そのものは出さない

対象メッセージ:
${input}
    `.trim();
  }

  if (instructionMode === "reply_only") {
    return `
以下のメッセージに対して、最適な返信文を1つだけ作成してください。

厳守:
- 入力メッセージと同じ言語で返す
- 本文のみを返す
- 解説、前置き、補足、箇条書き、翻訳は一切不要
- 引用符や見出しも不要
- そのまま相手に送れる自然な文面にする
- ユーザーが追加条件を指定した場合は、その条件を反映する

対象メッセージ:
${input}
    `.trim();
  }

  if (instructionMode === "polish") {
    const { draft, request } = parsePolishInput(input);

    return `
以下はユーザーが作成した返信ドラフトです。
このドラフトをベースに、自然で完成度の高い返信本文に整えてください。

厳守:
- 返信本文のみを返す
- 解説、前置き、補足、見出し、箇条書きは不要
- そのまま相手に送れる自然な文面にする
- ドラフトの意図をできるだけ維持する
- ユーザーの追加要望があれば反映する
- 言語指定が要望に含まれる場合はその言語で出力する
- 言語指定がない場合は、原則としてドラフトと同じ言語で出力する

ドラフト本文:
${draft}

追加要望:
${request || "なし"}
    `.trim();
  }

  return input;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mode } = body;

    // =========================
    // 🟢 CHATモード
    // =========================
    if (mode === "chat") {
      const { memory, recentMessages, input, instructionMode } = body;

      if (!input || typeof input !== "string") {
        return NextResponse.json({ error: "input missing" }, { status: 400 });
      }

      const normalizedMemory =
        typeof memory === "string"
          ? safeParseMemory(memory)
          : memory && typeof memory === "object"
            ? normalizeMemoryShape(memory)
            : createEmptyMemory();

      const safeInstructionMode: InstructionMode =
        instructionMode === "translate_explain" ||
        instructionMode === "reply_only" ||
        instructionMode === "polish"
          ? instructionMode
          : "normal";

      const searchQuery = parseSearchCommand(input);
      const useSearch = !!searchQuery;

      let searchText = "";
      let sources: { title: string; link: string }[] = [];

      if (useSearch && searchQuery) {
        console.log("🔍 SEARCH:", searchQuery);

        const result = await searchGoogle(searchQuery);
        searchText = result.text;
        sources = result.sources;
      }

      const messages: OpenAIMessage[] = [];

      messages.push({
        role: "system",
        content: `
You are a helpful assistant.

You MUST always use the structured long-term memory below when relevant.
This memory is the source of truth for preserved context across turns.

Important conversation rules:
- Continue the current topic naturally across follow-up questions.
- Short follow-up questions often omit the topic. Infer the omitted topic from memory and recent messages.
- If the user gives only a place name such as "鹿児島は？" and the active topic is weather, interpret it as asking about the weather in that place.
- If the user gives only a noun or short phrase, prefer continuity with the current topic unless the user clearly changed topics.
- Treat numbered items, lists, sequences, and structured data as exact when possible.
- If recent messages are incomplete, rely on memory.
- If memory and recent messages conflict, prefer the user's most recent explicit correction.
- Do not explicitly mention "memory" unless the user asks.

=== LONG-TERM MEMORY (JSON) ===
${memoryToPrompt(normalizedMemory)}
================================
        `.trim(),
      });

      if (useSearch && searchQuery) {
        messages.push({
          role: "system",
          content: `
以下は検索結果です。回答ではこの情報を優先して使用してください。
特に、天気・ニュース・時事情報のような最新性が重要な内容では、この検索情報を土台に回答してください。

${searchText}
          `.trim(),
        });
      }

      const trimmedRecent: ChatMessage[] = Array.isArray(recentMessages)
        ? recentMessages.slice(-16)
        : [];

      const recentOpenAIMessages: OpenAIMessage[] = trimmedRecent.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      }));

      messages.push(...recentOpenAIMessages);

      messages.push({
        role: "user",
        content: buildInstructionWrappedInput(input, safeInstructionMode),
      });

      console.log("🧠 USING MEMORY:", JSON.stringify(normalizedMemory, null, 2));
      console.log("🧠 RECENT COUNT:", trimmedRecent.length);
      console.log("🧠 INPUT COUNT:", messages.length);
      console.log("🧠 FINAL MESSAGES:", JSON.stringify(messages, null, 2));

      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          input: messages,
        }),
      });

      const data = await response.json();

      console.log("🧠 OPENAI RAW:", JSON.stringify(data, null, 2));

      const reply =
        data.output?.[0]?.content?.[0]?.text ||
        data.output_text ||
        "⚠️ reply not found";

      return NextResponse.json({
        reply,
        sources,
        usage: extractUsage(data),
      });
    }

    // =========================
    // 🟡 MEMORY UPDATEモード
    // =========================
    if (mode === "summarize") {
      const { memory, messages } = body;

      const normalizedMemory =
        typeof memory === "string"
          ? safeParseMemory(memory)
          : memory && typeof memory === "object"
            ? normalizeMemoryShape(memory)
            : createEmptyMemory();

      const safeMessages: ChatMessage[] = Array.isArray(messages) ? messages : [];

      const prompt = `
You are a memory updater for a chat system.

Your job is to update the long-term memory JSON from the latest conversation.

Return ONLY valid JSON.
Do not wrap it in markdown.
Do not add explanations.

Hard requirements:
- Preserve durable facts unless explicitly corrected.
- Preserve exact structured data when possible.
- Preserve numbered items, lists, ordered sequences, and mappings carefully.
- Track the CURRENT ACTIVE TOPIC in context.currentTopic.
- Track the CURRENT TASK in context.currentTask.
- Track how follow-up questions should be interpreted in context.followUpRule.
- Track the user's most recent intent in context.lastUserIntent.
- If the conversation is currently about weather in different places, store that clearly.
- If a short follow-up like "東京は？" or "鹿児島は？" should inherit the previous topic, write that rule explicitly in followUpRule.
- Do not over-compress away important context.
- Avoid duplicates.
- Keep schema stable.

Schema:
{
  "facts": [],
  "preferences": [],
  "lists": {},
  "context": {
    "currentTopic": "",
    "currentTask": "",
    "followUpRule": "",
    "lastUserIntent": ""
  }
}

Good examples for context:
- currentTopic: "日本各地の天気"
- currentTask: "ユーザーは地名を順番に挙げ、その地域の天気を聞いている"
- followUpRule: "地名だけの短い追質問は、直前の天気トピックを引き継いで解釈する"
- lastUserIntent: "次の地名の天気を知りたい"

Existing memory JSON:
${JSON.stringify(normalizedMemory, null, 2)}

New conversation messages:
${safeMessages.map((m) => `${m.role}: ${m.text}`).join("\n")}
      `.trim();

      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          input: prompt,
        }),
      });

      const data = await response.json();

      console.log("🧠 MEMORY UPDATE RAW:", JSON.stringify(data, null, 2));

      const rawMemory =
        data.output?.[0]?.content?.[0]?.text ||
        data.output_text ||
        JSON.stringify(normalizedMemory);

      const parsedMemory = safeParseMemory(rawMemory);

      console.log("🧠 FINAL MEMORY:", JSON.stringify(parsedMemory, null, 2));

      return NextResponse.json({
        memory: parsedMemory,
        usage: extractUsage(data),
      });
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (e) {
    console.error("💥 chatgpt route error:", e);
    return NextResponse.json({ error: "ChatGPTエラー" }, { status: 500 });
  }
}
