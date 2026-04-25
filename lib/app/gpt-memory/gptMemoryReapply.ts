import type { ApprovedMemoryRule, PendingMemoryRuleCandidate } from "@/lib/memoryInterpreterRules";
import { normalizeText } from "@/lib/app/memory-interpreter/memoryInterpreterText";
import type { KinMemoryState, Message } from "@/types/chat";
import { buildApprovedRuleFromCandidate } from "@/lib/app/gpt-memory/gptMemoryApproval";
import type { Memory } from "@/lib/memory";
import { buildRejectedReapplyContext } from "@/lib/app/memory-interpreter/memoryInterpreterContextReducer";

export function getReapplicableRecentMessages(state: KinMemoryState): Message[] {
  return Array.isArray(state.recentMessages) ? state.recentMessages : [];
}

export function mergeApprovedRulesWithCandidate(
  candidate: PendingMemoryRuleCandidate,
  approvedMemoryRules: ApprovedMemoryRule[]
): ApprovedMemoryRule[] {
  return [buildApprovedRuleFromCandidate(candidate), ...approvedMemoryRules];
}

export function buildRejectedCandidateReapplyMemory(
  memory: Memory,
  candidate: PendingMemoryRuleCandidate
): Memory {
  const rejectedValue = normalizeText(candidate.normalizedValue || candidate.phrase);
  const trackedEntities = Array.isArray(memory.lists?.trackedEntities)
    ? (memory.lists.trackedEntities as unknown[])
        .filter((item): item is string => typeof item === "string")
        .map((item) => normalizeText(item))
        .filter((item) => item && item !== rejectedValue)
    : [];

  return {
    facts: [],
    preferences: Array.isArray(memory.preferences) ? memory.preferences : [],
    lists: {
      ...(memory.lists?.activeDocument ? { activeDocument: memory.lists.activeDocument } : {}),
      ...(memory.lists?.recentSearchQueries
        ? { recentSearchQueries: memory.lists.recentSearchQueries }
        : {}),
      ...(trackedEntities.length > 0 ? { trackedEntities } : {}),
    },
    context: buildRejectedReapplyContext(memory.context),
  };
}
