import {
  buildBaseSystemPrompt,
  buildInstructionWrappedInput,
  buildSearchSystemPrompt,
} from "@/lib/server/chatgpt/promptBuilders";
import { normalizeChatMessages } from "@/lib/server/chatgpt/requestNormalization";
import type {
  InstructionMode,
  ReasoningMode,
} from "@/lib/server/chatgpt/requestNormalization";
import type { Memory } from "@/lib/memory";

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
};

export function wantsGoogleMapsLink(text: string) {
  if (!text) return false;
  const normalized = text.normalize("NFKC").toLowerCase();
  return (
    normalized.includes("google maps") ||
    normalized.includes("maps link") ||
    normalized.includes("map link") ||
    (normalized.includes("蝨ｰ蝗ｳ") && normalized.includes("繝ｪ繝ｳ繧ｯ")) ||
    (normalized.includes("繝槭ャ繝・") && normalized.includes("繝ｪ繝ｳ繧ｯ"))
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
  const messages: OpenAIMessage[] = [
    {
      role: "system",
      content: buildBaseSystemPrompt({
        normalizedMemory: args.normalizedMemory,
        reasoningMode: args.reasoningMode,
      }),
    },
  ];

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

  messages.push(
    ...normalizeChatMessages(args.recentMessages)
      .slice(-16)
      .map((message): OpenAIMessage => ({
        role: message.role === "user" ? "user" : "assistant",
        content: message.text,
      }))
  );

  messages.push({
    role: "user",
    content: buildInstructionWrappedInput(args.input, args.instructionMode),
  });

  return messages;
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
- If a short follow-up like "譚ｱ莠ｬ縺ｯ?" or "繝ｨ繝上ロ繧ｹ繝悶Ν繧ｰ縺ｯ?" should inherit the previous topic, write that rule explicitly in followUpRule.
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
- currentTopic: "譌･譛ｬ蜷・慍縺ｮ螟ｩ豌・
- currentTask: "繝ｦ繝ｼ繧ｶ繝ｼ縺ｯ蝨ｰ蝓溘ｒ鬆・分縺ｫ謖吶￡縲√◎縺ｮ蝨ｰ蝓溘・螟ｩ豌励ｒ閨槭＞縺ｦ縺・ｋ"
- followUpRule: "蝨ｰ蜷阪□縺代・遏ｭ縺・ｿｽ雉ｪ蝠上・縲∫峩蜑阪・螟ｩ豌励ヨ繝斐ャ繧ｯ繧貞ｼ輔″邯吶＞縺ｧ隗｣驥医☆繧・
- lastUserIntent: "谺｡縺ｮ蝨ｰ蝓溘・螟ｩ豌励ｒ遏･繧翫◆縺・

Existing memory JSON:
${JSON.stringify(args.normalizedMemory, null, 2)}

New conversation messages:
${args.safeMessages.map((m) => `${m.role}: ${m.text}`).join("\n")}
  `.trim();
}
