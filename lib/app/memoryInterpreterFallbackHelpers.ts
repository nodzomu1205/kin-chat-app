import type { ApprovedMemoryRule } from "@/lib/memoryInterpreterRules";
import {
  isClosingReplyText,
  isSearchDirectiveText,
  looksLikeLongNarrativeText,
  normalizeText,
  normalizeTopicCandidate,
} from "@/lib/app/memoryInterpreterText";

export type MemoryInterpreterFallbackResponse = {
  topic?: string | null;
  isClosingReply?: boolean | null;
  trackedEntity?: string | null;
  candidates?: Array<{
    phrase?: string;
    kind?: "topic_alias" | "closing_reply";
    normalizedValue?: string | null;
  }>;
};

export function applyApprovedMemoryRule(
  text: string,
  approvedRules: ApprovedMemoryRule[]
) {
  const normalized = normalizeText(text);
  const matched = [...approvedRules]
    .sort(
      (a, b) => normalizeText(b.phrase).length - normalizeText(a.phrase).length
    )
    .find((rule) => {
      const phrase = normalizeText(rule.phrase);
      if (!phrase) return false;
      return normalized === phrase || normalized.includes(phrase);
    });

  if (!matched) return {};
  if (matched.kind === "closing_reply") {
    return { closingReplyOverride: true };
  }
  if (matched.kind === "topic_alias" && matched.normalizedValue) {
    const normalizedValue = normalizeText(matched.normalizedValue);
    return {
      topicSeed: normalizedValue,
      trackedEntityOverride: normalizedValue,
    };
  }
  return {};
}

export function shouldUseMemoryFallback(text: string) {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  if (isSearchDirectiveText(normalized)) return false;
  if (isClosingReplyText(normalized)) return false;
  if (looksLikeLongNarrativeText(text)) return true;

  const candidate = normalizeTopicCandidate(normalized);
  return (
    !candidate ||
    candidate.length > 40 ||
    candidate === normalized.replace(/[!！。?？]+$/u, "").trim() ||
    /^(?:次は|では|今度は|一番興味があるのは)/u.test(normalized) ||
    /(?:について知っていますか|を知っていますか|のことを知っていますか|とは\?|は\?)$/u.test(
      normalized
    )
  );
}

export function tryParseMemoryFallbackJson(
  text: string
): MemoryInterpreterFallbackResponse | null {
  const trimmed = text.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as MemoryInterpreterFallbackResponse;
    }
  } catch {}

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(trimmed.slice(start, end + 1));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as MemoryInterpreterFallbackResponse;
      }
    } catch {}
  }
  return null;
}

export function buildMemoryFallbackPrompt(args: {
  latestUserText: string;
  currentTopic?: string;
  lastUserIntent?: string;
}) {
  return [
    "You are a memory interpreter for a chat system.",
    "Return JSON only. No markdown. No explanation.",
    "Interpret the latest user message for topic normalization and closing-reply detection.",
    "",
    "Return this shape:",
    "{",
    '  "topic": string | null,',
    '  "isClosingReply": boolean,',
    '  "trackedEntity": string | null,',
    '  "candidates": [',
    '    { "phrase": string, "kind": "topic_alias" | "closing_reply", "normalizedValue": string | null }',
    "  ]",
    "}",
    "",
    "Rules:",
    "- topic should be a concise noun phrase, not the whole question sentence.",
    "- If the user is politely closing or dismissing the topic, set isClosingReply=true and topic=null.",
    "- trackedEntity should be the primary entity name if obvious.",
    "- candidates should only include literal phrases from the latest user text.",
    "",
    `CURRENT_TOPIC: ${args.currentTopic || ""}`,
    `LAST_USER_INTENT: ${args.lastUserIntent || ""}`,
    "LATEST_USER_TEXT_START",
    args.latestUserText,
    "LATEST_USER_TEXT_END",
  ].join("\n");
}
