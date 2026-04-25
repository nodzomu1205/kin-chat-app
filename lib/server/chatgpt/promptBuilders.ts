import { memoryToPrompt } from "@/lib/memory-domain/memory";
import type { Memory } from "@/lib/memory-domain/memory";
import type {
  InstructionMode,
  ReasoningMode,
} from "@/lib/server/chatgpt/requestNormalization";

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

export function buildInstructionWrappedInput(
  input: string,
  instructionMode: InstructionMode
) {
  if (instructionMode === "translate_explain") {
    return `
Translate the following message into natural Japanese, then explain its nuance in Japanese.

Rules:
- First provide a natural Japanese rendering.
- Then explain tone, intention, and nuance clearly.
- If there are multiple possible interpretations, note the likely one.
- Keep the explanation concise and practical.

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
- Use the message context as-is.

Message:
${input}
    `.trim();
  }

  if (instructionMode === "polish") {
    const { draft, request } = parsePolishInput(input);

    return `
Polish the following draft in place.

Rules:
- Rewrite only the draft text.
- Preserve the intended meaning.
- Improve clarity, flow, and tone.
- If there is an explicit request, follow it.
- Output only the rewritten draft.

Draft:
${draft}

Revision request:
${request || "None"}
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
