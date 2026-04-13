import { NextResponse } from "next/server";
import { safeParseMemory } from "@/lib/memory";
import {
  callOpenAIResponses,
  extractOpenAIJsonObjectText,
} from "@/lib/server/chatgpt/openaiClient";
import {
  buildBaseSystemPrompt,
  buildInstructionWrappedInput,
  buildSearchSystemPrompt,
} from "@/lib/server/chatgpt/promptBuilders";
import {
  buildChatRouteResponse,
  buildMapLinkShortcutResponse,
} from "@/lib/server/chatgpt/responseBuilders";
import { executeSearchRequest } from "@/lib/server/chatgpt/searchExecution";
import { resolveSearchRequest } from "@/lib/server/chatgpt/searchRequest";
import {
  type ChatMessage,
  normalizeChatMessages,
  normalizeInstructionMode,
  normalizeMemoryInput,
  normalizeReasoningMode,
  resolveChatRouteMode,
} from "@/lib/server/chatgpt/requestNormalization";

type OpenAIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function wantsGoogleMapsLink(text: string) {
  if (!text) return false;
  const normalized = text.normalize("NFKC").toLowerCase();
  return (
    normalized.includes("google maps") ||
    normalized.includes("maps link") ||
    normalized.includes("map link") ||
    (normalized.includes("地図") && normalized.includes("リンク")) ||
    (normalized.includes("マップ") && normalized.includes("リンク"))
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mode = resolveChatRouteMode(body);

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
      } = body;

      if (!input || typeof input !== "string") {
        return NextResponse.json({ error: "input missing" }, { status: 400 });
      }

      const normalizedMemory = normalizeMemoryInput(memory);
      const safeInstructionMode = normalizeInstructionMode(instructionMode);
      const safeReasoningMode = normalizeReasoningMode(reasoningMode);

      const resolvedSearch = resolveSearchRequest({
        input,
        forcedSearchQuery,
        searchSeriesId,
      });
      const searchQuery = resolvedSearch.searchQuery;
      const parsedContinuation = resolvedSearch.continuation;
      const useSearch = resolvedSearch.useSearch;

      let searchText = "";
      let sources: {
        title: string;
        link: string;
        snippet?: string;
        sourceType?: string;
        publishedAt?: string;
        thumbnailUrl?: string;
        channelName?: string;
        duration?: string;
        viewCount?: string | number;
        videoId?: string;
      }[] = [];
      let returnedSearchContinuationToken = "";

      const buildSearchPayload = () => ({
        sources,
        searchUsed: useSearch,
        searchQuery: parsedContinuation.cleanQuery || searchQuery || "",
        searchSeriesId: resolvedSearch.effectiveSeriesId,
        searchContinuationToken: returnedSearchContinuationToken,
        searchEvidence: searchText,
      });

      if (useSearch && searchQuery) {
        const executedSearch = await executeSearchRequest({
          query: parsedContinuation.cleanQuery || searchQuery,
          searchMode,
          searchEngines,
          searchSeriesId: resolvedSearch.effectiveSeriesId || undefined,
          searchContinuationToken:
            typeof searchContinuationToken === "string"
              ? searchContinuationToken
              : undefined,
          searchAskAiModeLink:
            typeof searchAskAiModeLink === "string"
              ? searchAskAiModeLink
              : undefined,
          searchLocation:
            typeof searchLocation === "string" ? searchLocation : undefined,
        });

        searchText = executedSearch.searchText;
        returnedSearchContinuationToken =
          executedSearch.returnedSearchContinuationToken;
        sources = executedSearch.sources;

        if (wantsGoogleMapsLink(input)) {
          const mapLikeSource =
            executedSearch.rawSources.find((source) => {
              const link =
                typeof source.link === "string" ? source.link.toLowerCase() : "";
              return (
                link.includes("google.com/maps") ||
                link.includes("maps.google") ||
                link.includes("google.com/search")
              );
            }) || null;

          if (mapLikeSource?.link) {
            return NextResponse.json(
              buildMapLinkShortcutResponse({
                title: mapLikeSource.title,
                link: mapLikeSource.link,
                search: buildSearchPayload(),
              })
            );
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

      const trimmedRecent = normalizeChatMessages(recentMessages).slice(-16);
      const recentOpenAIMessages: OpenAIMessage[] = trimmedRecent.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      }));

      messages.push(...recentOpenAIMessages);
      messages.push({
        role: "user",
        content: buildInstructionWrappedInput(input, safeInstructionMode),
      });

      const { text: reply, usage } = await callOpenAIResponses(
        { input: messages },
        "GPT reply not found."
      );

      return NextResponse.json(
        buildChatRouteResponse({
          reply,
          usage,
          search: buildSearchPayload(),
        })
      );
    }

    if (mode === "summarize") {
      const { memory, messages } = body;

      const normalizedMemory = normalizeMemoryInput(memory);
      const safeMessages = normalizeChatMessages(messages);

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
- If a short follow-up like "東京は?" or "ヨハネスブルグは?" should inherit the previous topic, write that rule explicitly in followUpRule.
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
- currentTask: "ユーザーは地域を順番に挙げ、その地域の天気を聞いている"
- followUpRule: "地名だけの短い追質問は、直前の天気トピックを引き継いで解釈する"
- lastUserIntent: "次の地域の天気を知りたい"

Existing memory JSON:
${JSON.stringify(normalizedMemory, null, 2)}

New conversation messages:
${safeMessages.map((m) => `${m.role}: ${m.text}`).join("\n")}
      `.trim();

      const { text: rawMemory, usage } = await callOpenAIResponses(
        { input: prompt },
        JSON.stringify(normalizedMemory)
      );

      const parsedMemory = safeParseMemory(
        extractOpenAIJsonObjectText(rawMemory, JSON.stringify(normalizedMemory))
      );

      return NextResponse.json({
        memory: parsedMemory,
        usage,
      });
    }

    if (mode === "memory_interpret") {
      const { input } = body;

      if (!input || typeof input !== "string") {
        return NextResponse.json({ error: "input missing" }, { status: 400 });
      }

      const { text: reply, usage } = await callOpenAIResponses(
        { input },
        "{}"
      );

      return NextResponse.json({
        reply,
        usage,
      });
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (e) {
    console.error("chatgpt route error:", e);
    return NextResponse.json({ error: "ChatGPT error" }, { status: 500 });
  }
}
