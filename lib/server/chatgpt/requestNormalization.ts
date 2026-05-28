import {
  createEmptyMemory,
  normalizeMemoryShape,
  safeParseMemory,
} from "@/lib/memory-domain/memory";

export type ChatRouteMode = "chat" | "compact_recent" | "memory_interpret";

export type ChatMessage = {
  role: "user" | "gpt" | "kin" | "assistant";
  text: string;
};

export type InstructionMode =
  | "normal"
  | "translate_explain"
  | "reply_only"
  | "translate_reply_en"
  | "translate_reply_ru"
  | "translate_reply_jp";

export type ReasoningMode = "strict" | "creative";

export function resolveChatRouteMode(body: unknown): ChatRouteMode | null {
  if (!body || typeof body !== "object") return null;
  const mode = (body as { mode?: unknown }).mode;
  return mode === "chat" || mode === "compact_recent" || mode === "memory_interpret"
    ? mode
    : null;
}

export function normalizeInstructionMode(value: unknown): InstructionMode {
  return value === "translate_explain" ||
    value === "reply_only" ||
    value === "translate_reply_en" ||
    value === "translate_reply_ru" ||
    value === "translate_reply_jp"
    ? value
    : "normal";
}

export function normalizeReasoningMode(value: unknown): ReasoningMode {
  return value === "strict" ? "strict" : "creative";
}

export function normalizeMemoryInput(memory: unknown) {
  if (typeof memory === "string") {
    return safeParseMemory(memory);
  }

  if (memory && typeof memory === "object") {
    return normalizeMemoryShape(memory);
  }

  return createEmptyMemory();
}

export function normalizeChatMessages(messages: unknown): ChatMessage[] {
  if (!Array.isArray(messages)) return [];

  return messages.filter(
    (message): message is ChatMessage =>
      !!message &&
      typeof message === "object" &&
      ["user", "gpt", "kin", "assistant"].includes(
        String((message as { role?: unknown }).role)
      ) &&
      typeof (message as { text?: unknown }).text === "string"
  );
}

