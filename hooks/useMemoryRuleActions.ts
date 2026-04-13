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
  approvedMemoryRules: ApprovedMemoryRule[];
  setPendingMemoryRuleCandidates: Dispatch<
    SetStateAction<PendingMemoryRuleCandidate[]>
  >;
  setApprovedMemoryRules: Dispatch<SetStateAction<ApprovedMemoryRule[]>>;
  setRejectedMemoryRuleCandidateSignatures: Dispatch<SetStateAction<string[]>>;
  onApproveCandidateApplied?: (
    candidate: PendingMemoryRuleCandidate,
    nextApprovedRules: ApprovedMemoryRule[]
  ) => void | Promise<void>;
};

export function useMemoryRuleActions({
  setMemoryInterpreterSettings,
  pendingMemoryRuleCandidates,
  approvedMemoryRules,
  setPendingMemoryRuleCandidates,
  setApprovedMemoryRules,
  setRejectedMemoryRuleCandidateSignatures,
  onApproveCandidateApplied,
}: Params) {
  const updateMemoryInterpreterSettings = (
    patch: Partial<MemoryInterpreterSettings>
  ) => {
    setMemoryInterpreterSettings((prev) => ({
      ...prev,
      ...patch,
    }));
  };

  const approveMemoryRuleCandidate = async (candidateId: string) => {
    const candidate = pendingMemoryRuleCandidates.find(
      (item) => item.id === candidateId
    );
    if (!candidate) return;

    const candidateSignature = getMemoryRuleSignature(candidate);
    const exists = approvedMemoryRules.some(
      (item) => getMemoryRuleSignature(item) === candidateSignature
    );
    const nextApprovedRules = exists
      ? approvedMemoryRules
      : [
        {
          id: `memrule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          phrase: candidate.phrase,
          kind: candidate.kind,
          normalizedValue: candidate.normalizedValue,
          createdAt: new Date().toISOString(),
        },
        ...approvedMemoryRules,
      ].slice(0, 100);

    setApprovedMemoryRules(nextApprovedRules);

    setPendingMemoryRuleCandidates((prev) =>
      prev.filter((item) => item.id !== candidateId)
    );

    if (onApproveCandidateApplied) {
      await onApproveCandidateApplied(candidate, nextApprovedRules);
    }
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
