import { getMemoryRuleSignature } from "@/lib/memoryInterpreterRules";
import type {
  ApprovedMemoryRule,
  PendingMemoryRuleCandidate,
} from "@/lib/memoryInterpreterRules";
import type { MemoryUpdateOptions } from "@/hooks/useChatPageActions";

export type MemoryFallbackResult = {
  optionsPatch: Partial<MemoryUpdateOptions>;
  pendingCandidates: PendingMemoryRuleCandidate[];
  usedFallback: boolean;
};

export function filterPendingMemoryRuleCandidates(
  candidates: PendingMemoryRuleCandidate[],
  rejectedSignatures: string[]
) {
  return candidates.filter((candidate) => {
    const signature = getMemoryRuleSignature(candidate);
    return !rejectedSignatures.includes(signature);
  });
}

export function buildMemoryUpdateOptionsFromFallback(
  baseOptions: MemoryUpdateOptions | undefined,
  fallbackResult: Pick<MemoryFallbackResult, "optionsPatch">
): MemoryUpdateOptions {
  return {
    ...baseOptions,
    ...fallbackResult.optionsPatch,
  };
}

export function resolveApprovedMemoryRules(
  runtimeApprovedRules: ApprovedMemoryRule[] | undefined,
  configuredApprovedRules: ApprovedMemoryRule[]
) {
  return runtimeApprovedRules ?? configuredApprovedRules;
}
