"use client";

import { useCallback } from "react";
import { mergePendingMemoryRuleCandidates } from "@/lib/app/memory-rules/memoryRuleCandidateQueue";
import type {
  ApprovedMemoryRule,
  PendingMemoryRuleCandidate,
} from "@/lib/memory-domain/memoryInterpreterRules";

type UsePendingMemoryRuleQueueArgs = {
  approvedMemoryRules: ApprovedMemoryRule[];
  setPendingMemoryRuleCandidates: React.Dispatch<
    React.SetStateAction<PendingMemoryRuleCandidate[]>
  >;
};

export function usePendingMemoryRuleQueue(
  args: UsePendingMemoryRuleQueueArgs
) {
  const enqueuePendingMemoryRuleCandidates = useCallback(
    (
      candidates: PendingMemoryRuleCandidate[],
      approvedMemoryRulesOverride?: ApprovedMemoryRule[]
    ) => {
      args.setPendingMemoryRuleCandidates((prev) =>
        mergePendingMemoryRuleCandidates({
          prev,
          candidates,
          approvedMemoryRules:
            approvedMemoryRulesOverride ?? args.approvedMemoryRules,
        })
      );
    },
    [args]
  );

  return {
    enqueuePendingMemoryRuleCandidates,
  };
}
