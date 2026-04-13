import type { ApprovedMemoryRule, PendingMemoryRuleCandidate } from "@/lib/memoryInterpreterRules";
import type { KinMemoryState, Message } from "@/types/chat";
import { buildApprovedRuleFromCandidate } from "@/lib/app/gptMemoryApproval";

export function getReapplicableRecentMessages(state: KinMemoryState): Message[] {
  return Array.isArray(state.recentMessages) ? state.recentMessages : [];
}

export function mergeApprovedRulesWithCandidate(
  candidate: PendingMemoryRuleCandidate,
  approvedMemoryRules: ApprovedMemoryRule[]
): ApprovedMemoryRule[] {
  return [buildApprovedRuleFromCandidate(candidate), ...approvedMemoryRules];
}
