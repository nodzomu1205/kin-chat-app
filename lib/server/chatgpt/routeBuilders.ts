import {
  buildBaseSystemPrompt,
  buildInstructionWrappedInput,
  buildReplyDraftFollowupInput,
  buildSearchSystemPrompt,
} from "@/lib/server/chatgpt/promptBuilders";
import {
  extractReplyDraftOriginalSource,
  findLatestReplyDraftOfferMessage,
  isReplyDraftFollowupRequest,
} from "@/lib/shared/replyDraftFollowup";
import type { ChatPromptMetrics } from "@/lib/shared/chatPromptMetrics";
import { createEmptyMemory, memoryToPrompt } from "@/lib/memory-domain/memory";
import { normalizeChatMessages } from "@/lib/server/chatgpt/requestNormalization";
import type {
  InstructionMode,
  ReasoningMode,
} from "@/lib/server/chatgpt/requestNormalization";
import type { Memory } from "@/lib/memory-domain/memory";

export type OpenAIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatRouteSearchPayload = {
  sources: {
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
  }[];
  searchUsed: boolean;
  searchQuery: string;
  searchSeriesId: string;
  searchContinuationToken: string;
  searchEvidence: string;
  searchSummaryText: string;
  searchSummaryGenerated: boolean;
};

export function wantsGoogleMapsLink(text: string) {
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

export function buildChatSearchPayload(args: ChatRouteSearchPayload) {
  return args;
}

export function buildChatCompletionMessages(args: {
  normalizedMemory: Memory;
  reasoningMode: ReasoningMode;
  instructionMode: InstructionMode;
  input: string;
  recentMessages: unknown;
  storedLibraryContext?: unknown;
  storedSearchContext?: unknown;
  storedDocumentContext?: unknown;
  searchQuery?: string;
  searchText?: string;
}): OpenAIMessage[] {
  const normalizedRecent = normalizeChatMessages(args.recentMessages).slice(-16);
  const shouldBuildReplyDraftFollowup =
    args.instructionMode === "normal" &&
    isReplyDraftFollowupRequest({
      input: args.input,
      recentMessages: normalizedRecent,
    });
  const replyDraftOfferMessage = shouldBuildReplyDraftFollowup
    ? findLatestReplyDraftOfferMessage(normalizedRecent)
    : undefined;
  const replyDraftOriginalSource = replyDraftOfferMessage
    ? extractReplyDraftOriginalSource(replyDraftOfferMessage.text)
    : "";
  const recentMessagesForPrompt = shouldBuildReplyDraftFollowup
    ? []
    : normalizedRecent;
  const systemPromptMemory = shouldBuildReplyDraftFollowup
    ? createEmptyMemory()
    : args.normalizedMemory;

  const messages: OpenAIMessage[] = [
    {
      role: "system",
      content: buildBaseSystemPrompt({
        normalizedMemory: systemPromptMemory,
        reasoningMode: args.reasoningMode,
      }),
    },
  ];

  if (!shouldBuildReplyDraftFollowup) {
    for (const candidate of [
      args.storedLibraryContext,
      args.storedSearchContext,
      args.storedDocumentContext,
    ]) {
      if (typeof candidate === "string" && candidate.trim()) {
        messages.push({
          role: "system",
          content: candidate.trim(),
        });
      }
    }

    if (args.searchQuery && args.searchText) {
      messages.push({
        role: "system",
        content: buildSearchSystemPrompt(
          args.searchQuery,
          args.searchText,
          args.reasoningMode
        ),
      });
    }
  }

  messages.push(
    ...recentMessagesForPrompt
      .map((message): OpenAIMessage => ({
        role: message.role === "user" ? "user" : "assistant",
        content: message.text,
      }))
  );

  messages.push({
    role: "user",
    content: shouldBuildReplyDraftFollowup
      ? buildReplyDraftFollowupInput(args.input, replyDraftOriginalSource)
      : buildInstructionWrappedInput(args.input, args.instructionMode),
  });

  return messages;
}

function safeTrimmedLength(value: unknown) {
  return typeof value === "string" ? value.trim().length : 0;
}

export function buildChatPromptMetrics(args: {
  messages: OpenAIMessage[];
  normalizedMemory: Memory;
  reasoningMode: ReasoningMode;
  instructionMode: InstructionMode;
  input: string;
  recentMessages: unknown;
  storedLibraryContext?: unknown;
  storedSearchContext?: unknown;
  storedDocumentContext?: unknown;
  searchQuery?: string;
  searchText?: string;
}): ChatPromptMetrics {
  const normalizedRecent = normalizeChatMessages(args.recentMessages).slice(-16);
  const shouldBuildReplyDraftFollowup =
    args.instructionMode === "normal" &&
    isReplyDraftFollowupRequest({
      input: args.input,
      recentMessages: normalizedRecent,
    });
  const includedRecent = shouldBuildReplyDraftFollowup ? [] : normalizedRecent;
  const wrappedInput = shouldBuildReplyDraftFollowup
    ? buildReplyDraftFollowupInput(
        args.input,
        extractReplyDraftOriginalSource(
          findLatestReplyDraftOfferMessage(normalizedRecent)?.text || ""
        )
      )
    : buildInstructionWrappedInput(args.input, args.instructionMode);
  const systemPromptMemory = shouldBuildReplyDraftFollowup
    ? createEmptyMemory()
    : args.normalizedMemory;
  const baseSystemPrompt = buildBaseSystemPrompt({
    normalizedMemory: systemPromptMemory,
    reasoningMode: args.reasoningMode,
  });
  const searchPromptChars =
    !shouldBuildReplyDraftFollowup && args.searchQuery && args.searchText
      ? buildSearchSystemPrompt(
          args.searchQuery,
          args.searchText,
          args.reasoningMode
        ).length
      : 0;
  const memoryChars = memoryToPrompt(systemPromptMemory).length;
  const totalChars = args.messages.reduce(
    (sum, message) => sum + message.content.length,
    0
  );
  const systemChars = args.messages.reduce(
    (sum, message) => sum + (message.role === "system" ? message.content.length : 0),
    0
  );
  const recentChars = includedRecent.reduce(
    (sum, message) => sum + message.text.length,
    0
  );
  const recentUserChars = includedRecent.reduce(
    (sum, message) => sum + (message.role === "user" ? message.text.length : 0),
    0
  );
  const recentAssistantChars = includedRecent.reduce(
    (sum, message) => sum + (message.role !== "user" ? message.text.length : 0),
    0
  );

  return {
    messageCount: args.messages.length,
    systemMessageCount: args.messages.filter((message) => message.role === "system")
      .length,
    recentMessageCount: includedRecent.length,
    totalChars,
    systemChars,
    baseSystemChars: baseSystemPrompt.length,
    memoryChars,
    storedLibraryChars: shouldBuildReplyDraftFollowup
      ? 0
      : safeTrimmedLength(args.storedLibraryContext),
    storedSearchChars: shouldBuildReplyDraftFollowup
      ? 0
      : safeTrimmedLength(args.storedSearchContext),
    storedDocumentChars: shouldBuildReplyDraftFollowup
      ? 0
      : safeTrimmedLength(args.storedDocumentContext),
    searchPromptChars,
    recentChars,
    recentUserChars,
    recentAssistantChars,
    rawInputChars: args.input.length,
    wrappedInputChars: wrappedInput.length,
  };
}

export function buildMemoryUpdatePrompt(args: {
  normalizedMemory: Memory;
  safeMessages: Array<{ role: string; text: string }>;
}) {
  return `
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
- If a short follow-up like "本当は?" or "ヨハネスブルグは?" should inherit the previous topic, write that rule explicitly in followUpRule.
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
- currentTask: "ユーザーは地域を順番に尋ね、その地域の天気を続けている"
- followUpRule: "地域名だけの短い追質問は、直前の天気トピックを引き継いで解釈する"
- lastUserIntent: "次の地域の天気を知りたい"

Existing memory JSON:
${JSON.stringify(args.normalizedMemory, null, 2)}

New conversation messages:
${args.safeMessages.map((m) => `${m.role}: ${m.text}`).join("\n")}
  `.trim();
}

export function buildMemoryCompactionPrompt(args: {
  normalizedMemory: Memory;
  safeMessages: Array<{ role: string; text: string }>;
  recentKeep: number;
}) {
  return `
You are a chat history compactor for a memory-driven assistant.

Your job is NOT to rewrite memory.
The memory JSON below is already the authoritative state.
Your only job is to compress older recent messages into one short carry-forward note.

Return plain text only.
Do not return JSON.
Do not restate every message line-by-line.
Preserve the active topic, unresolved asks, user constraints, and anything needed so the next turns still make sense.
Keep it concise.

Authoritative memory JSON:
${JSON.stringify(args.normalizedMemory, null, 2)}

Recent messages to compact:
${args.safeMessages.map((m) => `${m.role}: ${m.text}`).join("\n")}

The newest ${args.recentKeep} messages will be kept verbatim outside this compaction note.
Write a short carry-forward summary for the older recent messages only.
  `.trim();
}
