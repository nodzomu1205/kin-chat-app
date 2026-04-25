export type MemoryRuleKind = "topic_alias" | "closing_reply" | "utterance_review";

export type UserUtteranceIntent =
  | "agreement"
  | "disagreement"
  | "question"
  | "request"
  | "statement"
  | "suggestion"
  | "acknowledgement"
  | "unknown";

export type TopicDecision = "keep" | "switch" | "unclear";

export type ApprovedMemoryRule = {
  id: string;
  phrase: string;
  kind: MemoryRuleKind;
  normalizedValue?: string;
  intent?: UserUtteranceIntent;
  topicDecision?: TopicDecision;
  confidence?: number;
  evidenceText?: string;
  leftContext?: string;
  rightContext?: string;
  surfacePattern?: string;
  approvedCount?: number;
  rejectedCount?: number;
  lastUsedAt?: string;
  createdAt: string;
};

export type PendingMemoryRuleCandidate = ApprovedMemoryRule & {
  sourceText: string;
};

export function resolveMemoryRuleTopicDecision(candidate: {
  kind: MemoryRuleKind;
  topicDecision?: TopicDecision;
}): TopicDecision | undefined {
  if (candidate.kind === "closing_reply") return "keep";
  if (candidate.kind === "topic_alias") return "switch";
  return candidate.topicDecision;
}

export type MemoryInterpreterSettings = {
  llmFallbackEnabled: boolean;
  saveRuleCandidates: boolean;
};

export const DEFAULT_MEMORY_INTERPRETER_SETTINGS: MemoryInterpreterSettings = {
  llmFallbackEnabled: true,
  saveRuleCandidates: true,
};

export function getMemoryRuleSignature(candidate: {
  kind: string;
  phrase: string;
  normalizedValue?: string;
  topicDecision?: string;
}) {
  const normalizedKey =
    candidate.normalizedValue?.trim() || candidate.phrase.trim();
  const topicDecision = candidate.topicDecision?.trim();
  return topicDecision
    ? [candidate.kind, topicDecision, normalizedKey].join("|")
    : [candidate.kind, normalizedKey].join("|");
}

export function getMemoryRulePhraseSignature(candidate: {
  kind: string;
  phrase: string;
}) {
  return [candidate.kind, candidate.phrase.trim()].join("|");
}

export function getMemoryRuleSourceSignature(candidate: {
  kind: string;
  sourceText?: string;
  phrase: string;
}) {
  const source = (candidate.sourceText || candidate.phrase).trim();
  return [candidate.kind, source].join("|");
}

export function getMemoryRuleReviewSignature(candidate: {
  kind: string;
  phrase: string;
  sourceText?: string;
  normalizedValue?: string;
  topicDecision?: string;
  intent?: string;
}) {
  const source = (candidate.sourceText || candidate.phrase).trim();
  const normalizedValue = candidate.normalizedValue?.trim() || "";
  const topicDecision = candidate.topicDecision?.trim() || "";
  const intent = candidate.intent?.trim() || "";
  return [candidate.kind, source, normalizedValue, topicDecision, intent].join("|");
}
