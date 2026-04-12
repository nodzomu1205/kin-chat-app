import { getMemoryRuleSignature } from "@/lib/memoryInterpreterRules";
import type {
  ApprovedMemoryRule,
  MemoryInterpreterSettings,
  PendingMemoryRuleCandidate,
} from "@/lib/memoryInterpreterRules";
import type { Dispatch, SetStateAction } from "react";

type Params = {
  setMemoryInterpreterSettings: Dispatch<
    SetStateAction<MemoryInterpreterSettings>
  >;
  pendingMemoryRuleCandidates: PendingMemoryRuleCandidate[];
  setPendingMemoryRuleCandidates: Dispatch<
    SetStateAction<PendingMemoryRuleCandidate[]>
  >;
  setApprovedMemoryRules: Dispatch<SetStateAction<ApprovedMemoryRule[]>>;
  setRejectedMemoryRuleCandidateSignatures: Dispatch<SetStateAction<string[]>>;
};

export function useMemoryRuleActions({
  setMemoryInterpreterSettings,
  pendingMemoryRuleCandidates,
  setPendingMemoryRuleCandidates,
  setApprovedMemoryRules,
  setRejectedMemoryRuleCandidateSignatures,
}: Params) {
  const updateMemoryInterpreterSettings = (
    patch: Partial<MemoryInterpreterSettings>
  ) => {
    setMemoryInterpreterSettings((prev) => ({
      ...prev,
      ...patch,
    }));
  };

  const approveMemoryRuleCandidate = (candidateId: string) => {
    const candidate = pendingMemoryRuleCandidates.find(
      (item) => item.id === candidateId
    );
    if (!candidate) return;

    setApprovedMemoryRules((prev) => {
      const exists = prev.some(
        (item) =>
          item.kind === candidate.kind &&
          item.phrase === candidate.phrase &&
          (item.normalizedValue || "") === (candidate.normalizedValue || "")
      );
      if (exists) return prev;
      return [
        {
          id: `memrule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          phrase: candidate.phrase,
          kind: candidate.kind,
          normalizedValue: candidate.normalizedValue,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 100);
    });

    setPendingMemoryRuleCandidates((prev) =>
      prev.filter((item) => item.id !== candidateId)
    );
  };

  const rejectMemoryRuleCandidate = (candidateId: string) => {
    const candidate = pendingMemoryRuleCandidates.find(
      (item) => item.id === candidateId
    );
    if (candidate) {
      const signature = getMemoryRuleSignature(candidate);
      setRejectedMemoryRuleCandidateSignatures((prev) =>
        prev.includes(signature) ? prev : [signature, ...prev].slice(0, 200)
      );
    }
    setPendingMemoryRuleCandidates((prev) =>
      prev.filter((item) => item.id !== candidateId)
    );
  };

  const deleteApprovedMemoryRule = (ruleId: string) => {
    setApprovedMemoryRules((prev) => prev.filter((item) => item.id !== ruleId));
  };

  return {
    updateMemoryInterpreterSettings,
    approveMemoryRuleCandidate,
    rejectMemoryRuleCandidate,
    deleteApprovedMemoryRule,
  };
}
