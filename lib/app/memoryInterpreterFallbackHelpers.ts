import type {
  ApprovedMemoryRule,
  UserUtteranceIntent,
} from "@/lib/memoryInterpreterRules";
import { findBestApprovedMemoryRuleMatch } from "@/lib/app/memoryInterpreterPatternMemory";
import {
  isSearchDirectiveText,
  normalizeText,
  normalizeTopicCandidate,
} from "@/lib/app/memoryInterpreterText";
import { buildRuleTopicAdjudication } from "@/lib/app/memoryTopicAdjudication";

export type MemoryInterpreterFallbackResponse = {
  decision?: "keep" | "switch" | "unsure" | null;
  confidence?: number | null;
  intent?: UserUtteranceIntent | null;
  proposedTopic?: string | null;
  topic?: string | null;
  isClosingReply?: boolean | null;
  trackedEntity?: string | null;
  evidenceText?: string | null;
  leftContext?: string | null;
  rightContext?: string | null;
  surfacePattern?: string | null;
};

function containsJapanese(text: string) {
  return /[\u3040-\u30ff\u3400-\u9fff]/u.test(text);
}

function looksLikeLowercaseEnglishPhrase(text: string) {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  if (!/^[a-z][a-z\s-]{2,}$/i.test(normalized)) return false;
  if (!/[a-z]/.test(normalized)) return false;
  if (/[A-Z]/.test(normalized)) return false;
  return true;
}

export function harmonizeFallbackResponseLanguage(args: {
  latestUserText: string;
  parsed: MemoryInterpreterFallbackResponse;
}): MemoryInterpreterFallbackResponse {
  const latestUserText = normalizeText(args.latestUserText);
  if (!containsJapanese(latestUserText)) return args.parsed;

  const parsed = { ...args.parsed };
  const fallbackTopic = normalizeTopicCandidate(latestUserText);

  if (
    typeof parsed.topic === "string" &&
    looksLikeLowercaseEnglishPhrase(parsed.topic)
  ) {
    parsed.topic = fallbackTopic || null;
  }

  if (
    typeof parsed.proposedTopic === "string" &&
    looksLikeLowercaseEnglishPhrase(parsed.proposedTopic)
  ) {
    parsed.proposedTopic = fallbackTopic || null;
  }

  if (
    typeof parsed.trackedEntity === "string" &&
    looksLikeLowercaseEnglishPhrase(parsed.trackedEntity)
  ) {
    parsed.trackedEntity = fallbackTopic || null;
  }

  return parsed;
}

export function applyApprovedMemoryRule(
  text: string,
  approvedRules: ApprovedMemoryRule[]
) {
  const matched = findBestApprovedMemoryRuleMatch(text, approvedRules);

  if (!matched) return {};
  return buildRuleTopicAdjudication({
    kind: matched.kind,
    topicDecision: matched.topicDecision,
    normalizedValue: matched.normalizedValue,
    phrase: matched.phrase,
  });
}

export function shouldUseMemoryFallback(text: string, currentTopic?: string) {
  void currentTopic;
  const normalized = normalizeText(text);
  if (!normalized) return false;
  if (isSearchDirectiveText(normalized)) return false;
  return true;
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
  currentTask?: string;
  lastUserIntent?: string;
  priorMeaningfulText?: string;
  earlierMeaningfulText?: string;
}) {
  return [
    "You are a topic adjudicator for a chat system.",
    "Return JSON only. No markdown. No explanation.",
    "Decide whether the latest user turn keeps the current topic, switches to a new topic, or remains unsure.",
    "",
    "Return this shape:",
    "{",
    '  "decision": "keep" | "switch" | "unsure",',
    '  "confidence": number,',
    '  "intent": "agreement" | "disagreement" | "question" | "request" | "statement" | "suggestion" | "acknowledgement" | "unknown",',
    '  "proposedTopic": string | null,',
    '  "topic": string | null,',
    '  "isClosingReply": boolean,',
    '  "trackedEntity": string | null,',
    '  "evidenceText": string | null,',
    '  "leftContext": string | null,',
    '  "rightContext": string | null,',
    '  "surfacePattern": string | null,',
    "}",
    "",
    "Rules:",
    "- Prefer 'keep' when the latest user turn is a follow-up, correction, truth-check, or continuation of the current topic.",
    "- intent should describe the user's communicative act.",
    "- Use 'switch' only when the user clearly starts a different topic.",
    "- Use 'unsure' when a new topic is plausible but not clearly established.",
    "- confidence must be between 0 and 1.",
    "- proposedTopic should be set only when decision is 'switch' or 'unsure'.",
    "- topic should be a concise noun phrase, not the whole question sentence.",
    "- topic and proposedTopic should use the same language as the latest user text whenever possible.",
    "- If the latest user text is Japanese, prefer Japanese topic labels instead of English paraphrases.",
    "- If the user is asking whether a previous claim is true, correct, or factual, set topic=null.",
    "- If the user is politely closing or dismissing the topic, set isClosingReply=true and topic=null.",
    "- trackedEntity should be the primary entity name if obvious.",
    "- evidenceText should be the shortest literal span from the latest user text that best supports your topic/intention judgment.",
    "- leftContext and rightContext should be short neighboring literal spans around evidenceText when they help disambiguate the meaning.",
    "- surfacePattern should be a normalized phrase pattern close to the latest user text when reusable; otherwise null.",
    "",
    `CURRENT_TOPIC: ${args.currentTopic || ""}`,
    `CURRENT_TASK: ${args.currentTask || ""}`,
    `LAST_USER_INTENT: ${args.lastUserIntent || ""}`,
    `PRIOR_MEANINGFUL_TEXT: ${args.priorMeaningfulText || ""}`,
    `EARLIER_MEANINGFUL_TEXT: ${args.earlierMeaningfulText || ""}`,
    "LATEST_USER_TEXT_START",
    args.latestUserText,
    "LATEST_USER_TEXT_END",
  ].join("\n");
}
