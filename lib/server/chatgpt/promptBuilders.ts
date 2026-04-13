import { memoryToPrompt } from "@/lib/memory";
import type { Memory } from "@/lib/memory";
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
1. 結論
2. 根拠
3. 不確実点
4. 出典

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
- If the user gives only a place name and the active topic is weather, interpret it as asking about the weather in that place.
- Treat structured lists as exact when possible.
- Prefer the user's latest explicit correction over older memory.
- Do not mention memory unless asked.

=== LONG-TERM MEMORY (JSON) ===
${memoryToPrompt(normalizedMemory)}
================================
  `.trim();
}

export function buildSearchSystemPrompt(
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
- If the evidence includes explicit accepted or supported items in a list, table, or bullet list, treat those items as confirmed.
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
- You do not need to preserve a rigid audit structure.
- If a fact is explicitly listed in the evidence, treat it as reliable.
- If something is not clearly stated, avoid overstating certainty.

SEARCH EVIDENCE START
${searchText}
SEARCH EVIDENCE END
  `.trim();
}
