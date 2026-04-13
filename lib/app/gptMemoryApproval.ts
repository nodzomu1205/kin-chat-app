import { normalizeMemoryTextValue } from "@/lib/app/gptMemoryCore";
import type { Memory } from "@/lib/memory";
import type { ApprovedMemoryRule, PendingMemoryRuleCandidate } from "@/lib/memoryInterpreterRules";
import type { MemoryUpdateOptions } from "@/hooks/useChatPageActions";
import type { KinMemoryState } from "@/types/chat";

export type ApprovedCandidateOptionsPatch = Partial<MemoryUpdateOptions> & {
  closingReplyOverride?: boolean;
  trackedEntityOverride?: string;
};

export function buildApprovedCandidateOptionsPatch(
  candidate: PendingMemoryRuleCandidate
): ApprovedCandidateOptionsPatch {
  return candidate.kind === "closing_reply"
    ? { closingReplyOverride: true }
    : {
        topicSeed: candidate.normalizedValue || candidate.phrase,
        trackedEntityOverride: candidate.normalizedValue || candidate.phrase,
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
    createdAt: candidate.createdAt,
  };
}

export function applyApprovedTopicToMemory(memory: Memory, approvedTopic: string): Memory {
  return {
    ...memory,
    context: {
      ...memory.context,
      currentTopic: approvedTopic,
      currentTask: `ユーザーは${approvedTopic}について知りたい`,
      followUpRule: `短い追質問は、直前の${approvedTopic}トピックを引き継いで解釈する`,
    },
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
