import { NextResponse } from "next/server";
import { searchWithMode } from "@/lib/search";
import { parseSearchContinuation } from "@/lib/search-domain/continuations";
import { normalizeStoredSearchMode } from "@/lib/search-domain/presets";
import { parseTaskInput } from "@/lib/taskInputParser";
import {
  createEmptyMemory,
  normalizeMemoryShape,
  safeParseMemory,
  memoryToPrompt,
} from "@/lib/memory";
import type { SearchEngine, SearchMode } from "@/types/task";

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

function parseSearchCommandStable(text: string) {
  if (!text) return null;
  return parseTaskInput(text).searchQuery.trim() || null;
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

function wantsGoogleMapsLink(text: string) {
  if (!text) return false;
  const normalized = text.normalize("NFKC").toLowerCase();
  return (
    normalized.includes("google maps") ||
    normalized.includes("google mapsへのリンク") ||
    normalized.includes("mapsへのリンク") ||
    normalized.includes("maps link") ||
    normalized.includes("map link") ||
    (normalized.includes("地図") && normalized.includes("リンク")) ||
    (normalized.includes("マップ") && normalized.includes("リンク"))
  );
}

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
You are a strict factual assistant.

- Priority: System > User > Search Evidence > Internal Knowledge.
- Do not guess missing facts.
- If explicit evidence exists, treat it as confirmed.
- If evidence is absent, say it is unknown.

- Prefer provided search evidence over internal knowledge.

# Output requirement
For factual verification tasks, use this exact structure:
1. 確認できる事実
2. 不明点
3. 解釈
4. 結論

# Style
- Be precise and cautious.
      `.trim()
      : `
You are a helpful conversational assistant.

- Be natural, concise, and clear.
- Use recent context and memory for continuity.
- Prefer provided search evidence over vague prior knowledge.
- Do not invent unsupported facts.
      `.trim();

  return `
${modeBlock}

Use the structured long-term memory below when relevant.

Important conversation rules:
- Continue the current topic across short follow-up questions when appropriate.
- If the user gives only a place name such as "鹿児島は？" and the active topic is weather, interpret it as asking about the weather in that place.
- Treat structured lists as exact when possible.
- Prefer the user's latest explicit correction over older memory.
- Do not mention memory unless asked.

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

function extractJsonObjectText(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]?.trim()) {
    return fencedMatch[1].trim();
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mode } = body;

    if (mode === "chat") {
      const {
        memory,
        recentMessages,
        input,
        instructionMode,
        reasoningMode,
        storedSearchContext,
        storedDocumentContext,
        storedLibraryContext,
        forcedSearchQuery,
        searchSeriesId,
        searchContinuationToken,
        searchAskAiModeLink,
        searchMode,
        searchEngines,
        searchLocation,
      } =
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

      const searchQuery =
        typeof forcedSearchQuery === "string" && forcedSearchQuery.trim()
          ? forcedSearchQuery.trim()
          : parseSearchCommandStable(input);
      const parsedContinuation = searchQuery
        ? parseSearchContinuation(searchQuery)
        : { cleanQuery: "", seriesId: undefined };
      const useSearch = !!searchQuery;

      let searchText = "";
      let sources: { title: string; link: string }[] = [];
      let returnedSearchContinuationToken = "";

      if (useSearch && searchQuery) {
        console.log("🔍 SEARCH:", searchQuery);
        const safeSearchMode: SearchMode =
          searchMode === "ai" ||
          searchMode === "integrated" ||
          searchMode === "ai_first" ||
          searchMode === "news" ||
          searchMode === "geo" ||
          searchMode === "travel" ||
          searchMode === "product" ||
          searchMode === "entity" ||
          searchMode === "evidence" ||
          searchMode === "normal"
            ? normalizeStoredSearchMode(searchMode)
            : "normal";
        const safeSearchEngines: SearchEngine[] = Array.isArray(searchEngines)
          ? searchEngines.filter((engine): engine is SearchEngine =>
                [
                  "google_search",
                  "google_ai_mode",
                  "google_news",
                  "google_maps",
                  "google_local",
                  "google_flights",
                "google_hotels",
                "google_shopping",
                "amazon_search",
              ].includes(String(engine))
            )
          : [];
        const result = await searchWithMode({
          query: parsedContinuation.cleanQuery || searchQuery,
          mode: safeSearchMode,
          engines: safeSearchEngines.length > 0 ? safeSearchEngines : undefined,
          seriesId:
            typeof searchSeriesId === "string" && searchSeriesId.trim()
              ? searchSeriesId.trim()
              : parsedContinuation.seriesId,
          continuationToken:
            typeof searchContinuationToken === "string" &&
            searchContinuationToken.trim()
              ? searchContinuationToken.trim()
              : undefined,
          askAiModeLink:
            typeof searchAskAiModeLink === "string" && searchAskAiModeLink.trim()
              ? searchAskAiModeLink.trim()
              : undefined,
          location:
            typeof searchLocation === "string" && searchLocation.trim()
              ? searchLocation.trim()
              : undefined,
          maxResults: 5,
        });
        searchText =
          result.rawText || result.summaryText || result.aiSummary || "";
        returnedSearchContinuationToken =
          typeof result.continuationToken === "string"
            ? result.continuationToken
            : "";
        sources = (result.sources || []).map((source) => ({
          title: source.title,
          link: source.link,
        }));

        if (wantsGoogleMapsLink(input)) {
          const mapLikeSource =
            (result.sources || []).find((source) => {
              const link = typeof source.link === "string" ? source.link.toLowerCase() : "";
              return (
                link.includes("google.com/maps") ||
                link.includes("maps.google") ||
                link.includes("google.com/search")
              );
            }) || null;

          if (mapLikeSource?.link) {
            return NextResponse.json({
              reply: `${mapLikeSource.title}\n${mapLikeSource.link}`,
              sources,
              usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
              searchUsed: true,
              searchQuery: parsedContinuation.cleanQuery || searchQuery || "",
              searchSeriesId:
                typeof searchSeriesId === "string" && searchSeriesId.trim()
                  ? searchSeriesId.trim()
                  : parsedContinuation.seriesId || "",
              searchContinuationToken: returnedSearchContinuationToken,
              searchEvidence: searchText,
            });
          }
        }
      }

      const messages: OpenAIMessage[] = [];

      messages.push({
        role: "system",
        content: buildBaseSystemPrompt({
          normalizedMemory,
          reasoningMode: safeReasoningMode,
        }),
      });

      if (
        typeof storedLibraryContext === "string" &&
        storedLibraryContext.trim()
      ) {
        messages.push({
          role: "system",
          content: storedLibraryContext.trim(),
        });
      }

      if (
        typeof storedSearchContext === "string" &&
        storedSearchContext.trim()
      ) {
        messages.push({
          role: "system",
          content: storedSearchContext.trim(),
        });
      }

      if (
        typeof storedDocumentContext === "string" &&
        storedDocumentContext.trim()
      ) {
        messages.push({
          role: "system",
          content: storedDocumentContext.trim(),
        });
      }

      if (useSearch && searchQuery && searchText) {
          messages.push({
            role: "system",
            content: buildSearchSystemPrompt(
              parsedContinuation.cleanQuery || searchQuery,
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
          searchUsed: useSearch,
          searchQuery: parsedContinuation.cleanQuery || searchQuery || "",
          searchSeriesId:
            typeof searchSeriesId === "string" && searchSeriesId.trim()
              ? searchSeriesId.trim()
              : parsedContinuation.seriesId || "",
          searchContinuationToken: returnedSearchContinuationToken,
          searchEvidence: searchText,
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

      const parsedMemory = safeParseMemory(extractJsonObjectText(rawMemory));

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
