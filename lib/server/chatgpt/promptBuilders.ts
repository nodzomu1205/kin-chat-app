import { memoryToPrompt } from "@/lib/memory-domain/memory";
import type { Memory } from "@/lib/memory-domain/memory";
import type {
  InstructionMode,
  ReasoningMode,
} from "@/lib/server/chatgpt/requestNormalization";
import { REPLY_DRAFT_OFFER_TEXT } from "@/lib/shared/replyDraftFollowup";

export function buildReplyDraftFollowupInput(
  input: string,
  originalSourceMessage?: string
) {
  const sourceBlock = originalSourceMessage?.trim()
    ? `
Original source message from [原文]:
${originalSourceMessage.trim()}
`
    : "";

  return `
The user accepted the previous offer to create a reply draft.
${sourceBlock}

Rules:
- Treat the original source message in [原文] as the message being replied to.
- Create a natural reply draft that answers or responds to the original source message.
- Assume the original source message is from a woman and the reply is from the male user.
- Write the reply draft in the same language as the original source message in [原文].
- If "Original source message from [原文]" is provided above, use that message as the authority for the reply language.
- Follow any extra constraints in the user's latest message, such as length, tone, or an explicit request to use a different language.
- If the original source asks for facts or commitments not supplied by the user, do not invent specifics; write a tactful reply that leaves room to confirm details.
- Output only the reply draft.
- Do not add headings or commentary.

User's latest request:
${input}
  `.trim();
}

export function buildInstructionWrappedInput(
  input: string,
  instructionMode: InstructionMode
) {
  if (instructionMode === "translate_explain") {
    return `
Translate the following source message into natural Japanese, then add a brief Japanese explanation.

Rules:
- Use exactly these section headings in this order:
  [原文]
  [日本語訳]
  [解説]
- In [原文], reproduce the source message.
- In [日本語訳], provide a natural Japanese translation.
- In [解説], add only a short, practical explanation of tone, intention, and nuance.
- Keep [解説] brief. Do not write a detailed linguistic analysis unless the user asks for it.
- After [解説], ask this exact question on its own line:
  ${REPLY_DRAFT_OFFER_TEXT}

Source message:
${input}
    `.trim();
  }

  if (instructionMode === "reply_only") {
    return `
Reply to the following message with one natural response.

Rules:
- Output only the reply text.
- Do not add headings or commentary.
- Keep the tone natural and helpful.
- Assume the message is from a woman and the reply is from the male user.
- Use the message context as-is.

Message:
${input}
    `.trim();
  }

  if (
    instructionMode === "translate_reply_en" ||
    instructionMode === "translate_reply_ru" ||
    instructionMode === "translate_reply_jp"
  ) {
    const targetLanguage =
      instructionMode === "translate_reply_en"
        ? "English"
        : instructionMode === "translate_reply_ru"
          ? "Russian"
          : "Japanese";

    return `
Translate the following reply draft into natural ${targetLanguage}.

Rules:
- Output only the translated reply text.
- Do not add headings, notes, alternatives, or commentary.
- Preserve the original meaning, tone, emoji, line breaks, and direct-address style when possible.
- If the input is already in ${targetLanguage}, lightly polish it only when needed.

Reply draft:
${input}
    `.trim();
  }

  return input;
}

export function buildBaseSystemPrompt(params: {
  normalizedMemory: Memory;
  reasoningMode: ReasoningMode;
}) {
  const { normalizedMemory, reasoningMode } = params;
  void reasoningMode;

  return `
- Prefer the user's latest explicit correction over older memory.
- Prefer provided evidence over internal knowledge.
- Do not invent unsupported facts.

Use the long-term memory below only when relevant.

== LONG-TERM MEMORY (JSON) ==
${memoryToPrompt(normalizedMemory)}
==
  `.trim();
}

export function buildSearchSystemPrompt(
  searchQuery: string,
  searchText: string,
  reasoningMode: ReasoningMode
) {
  void reasoningMode;

  return `
Search query:
${searchQuery}

Use only the evidence below for factual claims.
If the evidence is insufficient, say it is unknown.

EVIDENCE START
${searchText}
EVIDENCE END
  `.trim();
}
