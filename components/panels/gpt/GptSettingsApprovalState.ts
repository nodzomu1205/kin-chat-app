import {
  getCandidateTopicDecisionValue,
} from "@/components/panels/gpt/gptSettingsText";
import type {
  PendingMemoryRuleCandidate,
  TopicDecision,
  UserUtteranceIntent,
} from "@/lib/memory-domain/memoryInterpreterRules";

export const MEMORY_INTENT_OPTIONS: UserUtteranceIntent[] = [
  "agreement",
  "disagreement",
  "question",
  "request",
  "statement",
  "suggestion",
  "acknowledgement",
  "unknown",
];

export const TOPIC_DECISION_OPTIONS: TopicDecision[] = [
  "keep",
  "switch",
  "unclear",
];

export function buildOriginalSuggestedTopicMap(
  pendingCandidates: PendingMemoryRuleCandidate[]
) {
  const next: Record<string, string> = {};
  pendingCandidates.forEach((candidate) => {
    if (candidate.kind === "utterance_review") {
      next[candidate.id] = candidate.normalizedValue || "";
    }
  });
  return next;
}

export function resolveMemoryReviewTopicInputValue(args: {
  candidate: PendingMemoryRuleCandidate;
  currentTopic: string;
  originalSuggestedTopic: string;
}) {
  const decision = getCandidateTopicDecisionValue(args.candidate);
  const currentValue = args.candidate.normalizedValue || "";

  if (decision === "switch") return currentValue || args.originalSuggestedTopic;
  if (currentValue && currentValue !== args.originalSuggestedTopic) {
    return currentValue;
  }
  return args.currentTopic || currentValue;
}

export function buildTopicDecisionPatch(args: {
  candidate: PendingMemoryRuleCandidate;
  nextDecision: TopicDecision;
  currentTopic: string;
  originalSuggestedTopic: string;
}): Partial<PendingMemoryRuleCandidate> {
  return {
    kind: "utterance_review",
    topicDecision: args.nextDecision,
    normalizedValue:
      args.nextDecision === "switch"
        ? args.originalSuggestedTopic || args.candidate.normalizedValue || ""
        : args.currentTopic || args.candidate.normalizedValue || "",
  };
}
