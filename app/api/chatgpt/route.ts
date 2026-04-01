import { NextResponse } from "next/server";
import { searchGoogle } from "@/lib/search";
import {
  createEmptyMemory,
  normalizeMemoryShape,
  safeParseMemory,
  memoryToPrompt,
} from "@/lib/memory";

// 検索コマンド解析
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

type ReasoningMode = "strict" | "creative";

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

function buildBaseSystemPrompt(params: {
  normalizedMemory: ReturnType<typeof createEmptyMemory>;
  reasoningMode: ReasoningMode;
}) {
  const { normalizedMemory, reasoningMode } = params;

  const modeBlock =
    reasoningMode === "strict"
      ? `
You are a reasoning engine operating under strict information control.

# Source priority
System > User > Search Evidence > Internal Knowledge

# No guessing
- Never guess missing information.
- Never deny or override explicit source evidence with general memory.
- If something is not explicitly confirmed by the provided evidence, say it is unknown.

# Fact-first reasoning
Always reason in this order:
1. Extract verifiable facts
2. Separate known vs unknown
3. Interpret carefully
4. Conclude

# Scope separation
Always distinguish between:
- API capabilities
- This implementation limitations

# Model identity
- You do NOT know your real hidden runtime identity unless explicitly provided by system message.
- Never deny a user-provided model name unless system message explicitly contradicts it.

# Search handling
- Treat provided search evidence as higher priority than internal knowledge.
- If a source contains an explicit list, table, matrix, accepted types section, or bullet list, treat it as authoritative.
- Do NOT downgrade an explicit listed support item to "unclear".
- Only mark something unknown if the provided evidence does not explicitly confirm it.
- Prefer extracted evidence over broad summarization.

# Verification step
Before finalizing, silently check:
"Did I label any explicitly listed item as unknown or unclear?"
If yes, revise.

# Output requirement
For factual verification tasks, use this exact structure:
1. 確認できる事実
2. 不明点
3. 解釈
4. 結論

# Style
- Be precise
- Be cautious
- Be audit-like when appropriate
      `.trim()
      : `
You are a helpful assistant in creative conversation mode.

Goals:
- Be natural, fluent, and user-friendly.
- You may summarize and explain more conversationally than strict mode.
- Prefer readability over rigid structure unless the user requests structure.
- Use memory and recent context naturally.
- Prefer continuity across turns unless the user clearly changes topic.

Rules:
- If search evidence is provided, use it seriously.
- You may combine confirmed facts into a concise explanation.
- Do not invent unsupported facts.
- You do not need to explicitly separate known/unknown unless useful.
- You do not need to use the strict 4-section output format unless the user asks for verification or audit-style output.

Style:
- Answer naturally.
- Prefer concise synthesis over compliance-style formatting.
- Avoid sounding like a policy engine.
      `.trim();

  return `
${modeBlock}

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
  `.trim();
}

function buildSearchSystemPrompt(
  searchQuery: string,
  searchText: string,
  reasoningMode: ReasoningMode
) {
  if (reasoningMode === "strict") {
    return `
The user requested factual lookup with this query:
${searchQuery}

Below is source-grounded evidence collected from search results.

Critical rules:
- Use this evidence before any general model knowledge.
- If the evidence includes explicit accepted/supported items in a list, table, or bullet list, treat those items as confirmed.
- Do not collapse a confirmed item into "unclear".
- Keep unknowns narrow. Unknown means not explicitly stated in the provided evidence.
- When answering, rely on the extracted evidence, not on assumptions about the page.
- Use an audit style when appropriate.

SEARCH EVIDENCE START
${searchText}
SEARCH EVIDENCE END
    `.trim();
  }

  return `
The user requested lookup with this query:
${searchQuery}

Below is source-grounded evidence collected from search results.

Guidance:
- Prefer this evidence over vague prior knowledge.
- You may summarize the evidence naturally and conversationally.
- You do not need to preserve rigid audit structure.
- If a fact is explicitly listed in the evidence, treat it as reliable.
- If something is not clearly stated, avoid overstating certainty.

SEARCH EVIDENCE START
${searchText}
SEARCH EVIDENCE END
  `.trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mode } = body;

    if (mode === "chat") {
      const { memory, recentMessages, input, instructionMode, reasoningMode } =
        body;

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

      const safeReasoningMode: ReasoningMode =
        reasoningMode === "strict" ? "strict" : "creative";

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
        content: buildBaseSystemPrompt({
          normalizedMemory,
          reasoningMode: safeReasoningMode,
        }),
      });

      if (useSearch && searchQuery && searchText) {
        messages.push({
          role: "system",
          content: buildSearchSystemPrompt(
            searchQuery,
            searchText,
            safeReasoningMode
          ),
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

      console.log("🧠 REASONING MODE:", safeReasoningMode);
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
          model: "gpt-4o-mini",
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
          model: "gpt-4o-mini",
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