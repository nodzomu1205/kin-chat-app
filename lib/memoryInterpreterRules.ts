export type MemoryRuleKind = "topic_alias" | "closing_reply";

export type ApprovedMemoryRule = {
  id: string;
  phrase: string;
  kind: MemoryRuleKind;
  normalizedValue?: string;
  createdAt: string;
};

export type PendingMemoryRuleCandidate = ApprovedMemoryRule & {
  sourceText: string;
};

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
}) {
  const normalizedKey =
    candidate.normalizedValue?.trim() || candidate.phrase.trim();
  return [
    candidate.kind,
    normalizedKey,
  ].join("|");
}
