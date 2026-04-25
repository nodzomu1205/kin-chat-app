import { normalizeMemoryTextValue } from "@/lib/app/gpt-memory/gptMemoryCore";
import { applyCommittedTopicContext } from "@/lib/app/memory-interpreter/memoryInterpreterContextReducer";
import type { Memory } from "@/lib/memory";
import type {
  ApprovedMemoryRule,
  PendingMemoryRuleCandidate,
} from "@/lib/memoryInterpreterRules";
import type { MemoryUpdateOptions } from "@/hooks/chatPageActionTypes";
import type { KinMemoryState } from "@/types/chat";
import { buildRuleTopicAdjudication } from "@/lib/app/memoryTopicAdjudication";

export type ApprovedCandidateAdjudication = Partial<MemoryUpdateOptions> & {
  topicAdjudication?: ReturnType<typeof buildRuleTopicAdjudication>;
};

export function buildApprovedCandidateAdjudication(
  candidate: PendingMemoryRuleCandidate
): ApprovedCandidateAdjudication {
  return {
    topicAdjudication: buildRuleTopicAdjudication({
      kind: candidate.kind,
      topicDecision: candidate.topicDecision,
      normalizedValue: candidate.normalizedValue,
      phrase: candidate.phrase,
    }),
  };
}

export function resolveApprovedTopicFromCandidate(
  candidate: PendingMemoryRuleCandidate | ApprovedMemoryRule
) {
  return normalizeMemoryTextValue(candidate.normalizedValue || candidate.phrase);
}

export function buildApprovedRuleFromCandidate(
  candidate: PendingMemoryRuleCandidate
): ApprovedMemoryRule {
  return {
    id: candidate.id,
    phrase: normalizeMemoryTextValue(candidate.phrase),
    kind: candidate.kind,
    normalizedValue: candidate.normalizedValue
      ? normalizeMemoryTextValue(candidate.normalizedValue)
      : undefined,
    intent: candidate.intent,
    topicDecision: candidate.topicDecision,
    confidence: candidate.confidence,
    evidenceText: candidate.evidenceText
      ? normalizeMemoryTextValue(candidate.evidenceText)
      : undefined,
    leftContext: candidate.leftContext
      ? normalizeMemoryTextValue(candidate.leftContext)
      : undefined,
    rightContext: candidate.rightContext
      ? normalizeMemoryTextValue(candidate.rightContext)
      : undefined,
    surfacePattern: candidate.surfacePattern
      ? normalizeMemoryTextValue(candidate.surfacePattern)
      : undefined,
    approvedCount: candidate.approvedCount,
    rejectedCount: candidate.rejectedCount,
    lastUsedAt: candidate.lastUsedAt,
    createdAt: candidate.createdAt,
  };
}

export function applyApprovedTopicToMemory(
  memory: Memory,
  approvedTopic: string
): Memory {
  return {
    ...memory,
    context: applyCommittedTopicContext(memory.context, approvedTopic),
    lists: {
      ...memory.lists,
      trackedEntities: Array.from(
        new Set(
          [
            approvedTopic,
            ...((Array.isArray(memory.lists?.trackedEntities)
              ? (memory.lists?.trackedEntities as string[])
              : []) || []),
          ]
            .map((item) => normalizeMemoryTextValue(item))
            .filter(Boolean)
        )
      ).slice(-8),
    },
  };
}

export function applyApprovedTopicToKinState(
  state: KinMemoryState,
  approvedTopic: string
): KinMemoryState {
  return {
    ...state,
    memory: applyApprovedTopicToMemory(state.memory, approvedTopic),
  };
}
