import type { TaskIntent } from "@/types/taskProtocol";

export type TaskIntentFallbackKind =
  | "ask_gpt"
  | "ask_user"
  | "search_request"
  | "youtube_transcript_request"
  | "library_reference"
  | "char_limit";

export type TaskIntentFallbackCandidate = {
  phrase: string;
  draftText?: string;
  kind: TaskIntentFallbackKind;
  count?: number | null;
  rule?: "exact" | "at_least" | "up_to" | "around" | null;
  charLimit?: number | null;
};

export type TaskIntentFallbackPayload = {
  suggestedTitle: string | null;
  candidates: TaskIntentFallbackCandidate[];
};

function tryParseJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {}

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(trimmed.slice(start, end + 1));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {}
  }

  return null;
}

function asKind(value: unknown): TaskIntentFallbackKind | null {
  return value === "ask_gpt" ||
    value === "ask_user" ||
    value === "search_request" ||
    value === "youtube_transcript_request" ||
    value === "library_reference" ||
    value === "char_limit"
    ? value
    : null;
}

function asRule(value: unknown): "exact" | "at_least" | "up_to" | "around" | null {
  return value === "exact" ||
    value === "at_least" ||
    value === "up_to" ||
    value === "around"
    ? value
    : null;
}

export function buildTaskIntentFallbackPrompt(input: string, baseline: TaskIntent) {
  return [
    "You are a task-intent parser for a Kin/GPT workflow.",
    "Read USER_TEXT and return JSON only.",
    "No markdown. No explanation. No code fences.",
    "",
    "Return this exact JSON shape:",
    "{",
    '  "suggestedTitle": string | null,',
    '  "candidates": [',
    "    {",
    '      "phrase": string,',
    '      "draftText": string,',
    '      "kind": "ask_gpt" | "ask_user" | "search_request" | "youtube_transcript_request" | "library_reference" | "char_limit",',
    '      "count": number | null,',
    '      "rule": "exact" | "at_least" | "up_to" | "around" | null,',
    '      "charLimit": number | null',
    "    }",
    "  ]",
    "}",
    "",
    "Rules:",
    "- Extract only explicit phrases that literally appear in USER_TEXT.",
    "- phrase must be copied from USER_TEXT exactly as written.",
    "- Do not infer hidden limits or rewrite the user's meaning.",
    '- Set draftText to an editable protocol sentence such as "CAN ask GPT up to 3 times".',
    "- Classify by meaning, not by surface similarity.",
    "- If a phrase limits asking GPT or requesting GPT help, classify it as ask_gpt.",
    "- If a phrase limits web search, online search, Google search, or external fact lookup, classify it as search_request.",
    "- If a phrase limits asking the user something, classify it as ask_user.",
    "- If a phrase limits fetching YouTube transcripts, video transcripts, or content extraction from videos, classify it as youtube_transcript_request.",
    "- If a phrase limits retrieving stored library items or library references, classify it as library_reference.",
    "- If a phrase specifies output length or character count, classify it as char_limit.",
    "- Never convert ask_gpt into search_request.",
    "- Never convert search_request into ask_gpt.",
    "- Preserve the intended count rule: exactly, at least, up to, or around.",
    "- For Japanese wording like 以上, use at_least.",
    "- For Japanese wording like まで, 迄, 以内, use up_to.",
    "- Suggested title should be short, concrete, and preserve the user language when possible.",
    "",
    "draftText patterns:",
    '- ask_gpt -> "CAN ask GPT up to 3 times"',
    '- ask_user -> "CAN ask user up to 2 times"',
    '- search_request -> "CAN search request up to 3 times"',
    '- youtube_transcript_request -> "CAN content request up to 5 times"',
    '- library_reference -> "CAN library reference up to 2 times"',
    '- char_limit -> "MUST keep final output at least 1000 Japanese characters"',
    "",
    `BASELINE_ALLOW_SEARCH_REQUEST: ${baseline.workflow?.allowSearchRequest ? "YES" : "NO"}`,
    `BASELINE_ALLOW_YOUTUBE_TRANSCRIPT_REQUEST: ${baseline.workflow?.allowYoutubeTranscriptRequest ? "YES" : "NO"}`,
    `BASELINE_ALLOW_LIBRARY_REFERENCE: ${baseline.workflow?.allowLibraryReference ? "YES" : "NO"}`,
    "",
    "USER_TEXT_START",
    input,
    "USER_TEXT_END",
  ].join("\n");
}

export function extractTaskIntentFallbackPayload(
  replyText: string
): TaskIntentFallbackPayload | null {
  const parsed = tryParseJsonObject(replyText);
  if (!parsed) return null;

  const candidates: TaskIntentFallbackCandidate[] = Array.isArray(parsed.candidates)
    ? parsed.candidates.flatMap((raw) => {
        if (!raw || typeof raw !== "object") return [];
        const item = raw as Record<string, unknown>;
        const kind = asKind(item.kind);
        const phrase = typeof item.phrase === "string" ? item.phrase.trim() : "";
        if (!kind || !phrase) return [];

        return [
          {
            phrase,
            draftText:
              typeof item.draftText === "string" && item.draftText.trim()
                ? item.draftText.trim()
                : undefined,
            kind,
            count: typeof item.count === "number" ? item.count : null,
            rule: asRule(item.rule),
            charLimit: typeof item.charLimit === "number" ? item.charLimit : null,
          },
        ];
      })
    : [];

  return {
    suggestedTitle:
      typeof parsed.suggestedTitle === "string" && parsed.suggestedTitle.trim()
        ? parsed.suggestedTitle.trim()
        : null,
    candidates,
  };
}
