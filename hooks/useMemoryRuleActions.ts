import {
  getMemoryRulePhraseSignature,
  getMemoryRuleReviewSignature,
  getMemoryRuleSignature,
  getMemoryRuleSourceSignature,
} from "@/lib/memory-domain/memoryInterpreterRules";
import { buildApprovedRuleFromCandidate } from "@/lib/app/gpt-memory/gptMemoryApproval";
import type {
  ApprovedMemoryRule,
  MemoryInterpreterSettings,
  PendingMemoryRuleCandidate,
} from "@/lib/memory-domain/memoryInterpreterRules";
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
  onRejectCandidateApplied?: (
    candidate: PendingMemoryRuleCandidate,
    nextRejectedSignatures: string[]
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
  onRejectCandidateApplied,
}: Params) {
  const touchApprovedRuleUsage = (rule: ApprovedMemoryRule, patch?: Partial<ApprovedMemoryRule>) => ({
    ...rule,
    ...patch,
    lastUsedAt: new Date().toISOString(),
  });

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

    const candidatePhraseSignature = getMemoryRulePhraseSignature(candidate);
    const candidateSignature = getMemoryRuleSignature(candidate);
    const candidateReviewSignature = getMemoryRuleReviewSignature(candidate);
    const candidateSourceSignature = getMemoryRuleSourceSignature(candidate);
    const existingRule = approvedMemoryRules.find(
      (item) => getMemoryRuleSignature(item) === candidateSignature
    );
    const approvedRuleBase = buildApprovedRuleFromCandidate(candidate);
    const nextApprovedRules = existingRule
      ? approvedMemoryRules.map((item) =>
          item.id === existingRule.id
            ? touchApprovedRuleUsage(item, {
                approvedCount: (item.approvedCount ?? 0) + 1,
                rejectedCount: item.rejectedCount ?? 0,
              })
            : item
        )
      : [
        {
          ...approvedRuleBase,
          id: `memrule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: new Date().toISOString(),
          approvedCount: (approvedRuleBase.approvedCount ?? 0) + 1,
          lastUsedAt: new Date().toISOString(),
        },
        ...approvedMemoryRules,
      ].slice(0, 100);

    setApprovedMemoryRules(nextApprovedRules);

    setPendingMemoryRuleCandidates((prev) =>
      prev.filter(
        (item) =>
          item.id !== candidateId &&
          getMemoryRuleSignature(item) !== candidateSignature &&
          getMemoryRulePhraseSignature(item) !== candidatePhraseSignature &&
          getMemoryRuleReviewSignature(item) !== candidateReviewSignature &&
          getMemoryRuleSourceSignature(item) !== candidateSourceSignature
      )
    );

    if (onApproveCandidateApplied) {
      await onApproveCandidateApplied(candidate, nextApprovedRules);
    }
  };

  const updateMemoryRuleCandidate = (
    candidateId: string,
    patch: Partial<PendingMemoryRuleCandidate>
  ) => {
    setPendingMemoryRuleCandidates((prev) =>
      prev.map((item) =>
        item.id === candidateId
          ? {
              ...item,
              ...patch,
            }
          : item
      )
    );
  };

  const rejectMemoryRuleCandidate = async (candidateId: string) => {
    const candidate = pendingMemoryRuleCandidates.find(
      (item) => item.id === candidateId
    );
    let nextRejectedSignatures: string[] | null = null;
    if (candidate) {
      const candidateSignature = getMemoryRuleSignature(candidate);
      const phraseSignature = getMemoryRulePhraseSignature(candidate);
      setApprovedMemoryRules((prev) =>
        prev.map((item) => {
          const itemSignature = getMemoryRuleSignature(item);
          const itemPhraseSignature = getMemoryRulePhraseSignature(item);
          if (
            itemSignature !== candidateSignature &&
            itemPhraseSignature !== phraseSignature
          ) {
            return item;
          }
          return touchApprovedRuleUsage(item, {
            rejectedCount: (item.rejectedCount ?? 0) + 1,
            approvedCount: item.approvedCount ?? 0,
          });
        })
      );
    }
    if (candidate) {
      const signatures = [
        getMemoryRuleSignature(candidate),
        getMemoryRulePhraseSignature(candidate),
        getMemoryRuleReviewSignature(candidate),
        getMemoryRuleSourceSignature(candidate),
      ];
      setRejectedMemoryRuleCandidateSignatures((prev) => {
        const next = [
          ...signatures.filter((signature) => !prev.includes(signature)),
          ...prev,
        ].slice(0, 200);
        nextRejectedSignatures = next;
        return next;
      });
    }
    setPendingMemoryRuleCandidates((prev) =>
      candidate
        ? prev.filter(
            (item) =>
              item.id !== candidateId &&
              getMemoryRuleSignature(item) !== getMemoryRuleSignature(candidate) &&
              getMemoryRulePhraseSignature(item) !== getMemoryRulePhraseSignature(candidate) &&
              getMemoryRuleReviewSignature(item) !== getMemoryRuleReviewSignature(candidate) &&
              getMemoryRuleSourceSignature(item) !== getMemoryRuleSourceSignature(candidate)
          )
        : prev.filter((item) => item.id !== candidateId)
    );

    if (candidate && nextRejectedSignatures && onRejectCandidateApplied) {
      await onRejectCandidateApplied(candidate, nextRejectedSignatures);
    }
  };

  const deleteApprovedMemoryRule = (ruleId: string) => {
    setApprovedMemoryRules((prev) => prev.filter((item) => item.id !== ruleId));
  };

  return {
    updateMemoryInterpreterSettings,
    updateMemoryRuleCandidate,
    approveMemoryRuleCandidate,
    rejectMemoryRuleCandidate,
    deleteApprovedMemoryRule,
  };
}
