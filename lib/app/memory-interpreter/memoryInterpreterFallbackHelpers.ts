import type {
  ApprovedMemoryRule,
  UserUtteranceIntent,
} from "@/lib/memoryInterpreterRules";
import { findBestApprovedMemoryRuleMatch } from "@/lib/app/memory-interpreter/memoryInterpreterPatternMemory";
import {
  isSearchDirectiveText,
  normalizeText,
} from "@/lib/app/memory-interpreter/memoryInterpreterText";
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
    "Return JSON only.",
    "Write topic labels in the same language used in the chat.",
    "Decide whether the latest user turn keeps the current topic, switches to a new topic, or remains unsure.",
    "",
    'Always return non-null strings for "proposedTopic".',
    "",
    "Topic adjudication schema:",
    "{",
    '  "decision": "keep" | "switch" | "unsure",',
    '  "intent": "agreement" | "disagreement" | "question" | "request" | "statement" | "suggestion" | "acknowledgement" | "unknown",',
    '  "proposedTopic": string,',
    '  "topic": string,',
    '  "isClosingReply": boolean,',
    "}",
    "",
    ...(args.currentTopic ? [`TOPIC: ${args.currentTopic}`] : []),
    ...(args.currentTask ? [`TASK: ${args.currentTask}`] : []),
    ...(args.lastUserIntent ? [`LAST_INTENT: ${args.lastUserIntent}`] : []),
    ...(args.priorMeaningfulText ? [`PRIOR: ${args.priorMeaningfulText}`] : []),
    ...(args.earlierMeaningfulText ? [`EARLIER: ${args.earlierMeaningfulText}`] : []),
    "USER:",
    args.latestUserText,
  ].join("\n");
}
