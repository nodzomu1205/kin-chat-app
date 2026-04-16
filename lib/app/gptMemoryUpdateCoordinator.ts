import type { Memory, MemorySettings } from "@/lib/memory";
import type {
  ApprovedMemoryRule,
  MemoryInterpreterSettings,
  PendingMemoryRuleCandidate,
} from "@/lib/memoryInterpreterRules";
import type { MemoryUpdateOptions } from "@/hooks/chatPageActionTypes";
import type { KinMemoryState, Message } from "@/types/chat";
import type { TokenUsage } from "@/lib/app/gptMemoryStateHelpers";
import { prepareCandidateMemoryUpdate } from "@/lib/app/gptMemoryCandidatePreparation";
import { resolveMemorySummaryState } from "@/lib/app/gptMemorySummaryResolution";
import { resolveApprovedMemoryRules } from "@/lib/app/gptMemoryFallback";
import { buildApprovedCandidateAdjudication } from "@/lib/app/gptMemoryApproval";
import {
  buildRejectedCandidateReapplyMemory,
  getReapplicableRecentMessages,
  mergeApprovedRulesWithCandidate,
} from "@/lib/app/gptMemoryReapply";

export async function runGptMemoryUpdateCycle(params: {
  currentState: KinMemoryState;
  updatedRecent: Message[];
  settings: MemorySettings;
  options?: MemoryUpdateOptions;
  memoryInterpreterSettings: MemoryInterpreterSettings;
  approvedMemoryRules: ApprovedMemoryRule[];
  rejectedMemoryRuleCandidateSignatures: string[];
  approvedMemoryRulesOverride?: ApprovedMemoryRule[];
  rejectedMemoryRuleCandidateSignaturesOverride?: string[];
  currentMemoryOverride?: Memory;
  onAddPendingMemoryRuleCandidates: (
    candidates: PendingMemoryRuleCandidate[],
    approvedMemoryRulesOverride?: ApprovedMemoryRule[]
  ) => void;
}): Promise<{
  nextState: KinMemoryState;
  summaryUsage: TokenUsage | null;
}> {
  const currentMemory = params.currentMemoryOverride ?? params.currentState.memory;
  const activeApprovedRules = resolveApprovedMemoryRules(
    params.approvedMemoryRulesOverride,
    params.approvedMemoryRules
  );
  const { trimmedRecent, candidateMemory, needsSummary, filteredPendingCandidates } =
    await prepareCandidateMemoryUpdate({
      currentMemory,
      updatedRecent: params.updatedRecent,
      settings: params.settings,
      options: params.options,
      memoryInterpreterSettings: params.memoryInterpreterSettings,
      approvedRules: activeApprovedRules,
      rejectedMemoryRuleCandidateSignatures:
        params.rejectedMemoryRuleCandidateSignaturesOverride ??
        params.rejectedMemoryRuleCandidateSignatures,
    });

  if (filteredPendingCandidates.length > 0) {
    params.onAddPendingMemoryRuleCandidates(
      filteredPendingCandidates,
      activeApprovedRules
    );
  }

  if (!needsSummary) {
    return {
      nextState: {
        memory: candidateMemory,
        recentMessages: trimmedRecent,
      },
      summaryUsage: null,
    };
  }

  const result = await resolveMemorySummaryState({
    candidateMemory,
    trimmedRecent,
    settings: params.settings,
  });

  return {
    nextState: result.nextState,
    summaryUsage: result.summaryUsage,
  };
}

export async function runGptMemoryApprovedRulesReapplyCycle(params: {
  currentState: KinMemoryState;
  settings: MemorySettings;
  memoryInterpreterSettings: MemoryInterpreterSettings;
  approvedMemoryRules: ApprovedMemoryRule[];
  rejectedMemoryRuleCandidateSignatures: string[];
  approvedMemoryRulesOverride: ApprovedMemoryRule[];
  onAddPendingMemoryRuleCandidates: (
    candidates: PendingMemoryRuleCandidate[],
    approvedMemoryRulesOverride?: ApprovedMemoryRule[]
  ) => void;
}): Promise<{
  nextState: KinMemoryState | null;
  summaryUsage: TokenUsage | null;
}> {
  const updatedRecent = getReapplicableRecentMessages(params.currentState);
  if (updatedRecent.length === 0) {
    return { nextState: null, summaryUsage: null };
  }
  return runGptMemoryUpdateCycle({
    currentState: params.currentState,
    updatedRecent,
    settings: params.settings,
    memoryInterpreterSettings: params.memoryInterpreterSettings,
    approvedMemoryRules: params.approvedMemoryRules,
    rejectedMemoryRuleCandidateSignatures:
      params.rejectedMemoryRuleCandidateSignatures,
    approvedMemoryRulesOverride: params.approvedMemoryRulesOverride,
    onAddPendingMemoryRuleCandidates: params.onAddPendingMemoryRuleCandidates,
  });
}

export async function runGptMemoryApprovedCandidateReapplyCycle(params: {
  currentState: KinMemoryState;
  settings: MemorySettings;
  memoryInterpreterSettings: MemoryInterpreterSettings;
  approvedMemoryRules: ApprovedMemoryRule[];
  rejectedMemoryRuleCandidateSignatures: string[];
  candidate: PendingMemoryRuleCandidate;
  approvedMemoryRulesOverride: ApprovedMemoryRule[];
  onAddPendingMemoryRuleCandidates: (
    candidates: PendingMemoryRuleCandidate[],
    approvedMemoryRulesOverride?: ApprovedMemoryRule[]
  ) => void;
}): Promise<{
  nextState: KinMemoryState | null;
  summaryUsage: TokenUsage | null;
}> {
  const updatedRecent = getReapplicableRecentMessages(params.currentState);
  if (updatedRecent.length === 0) {
    return { nextState: null, summaryUsage: null };
  }
  return runGptMemoryUpdateCycle({
    currentState: params.currentState,
    updatedRecent,
    settings: params.settings,
    options: buildApprovedCandidateAdjudication(params.candidate),
    memoryInterpreterSettings: params.memoryInterpreterSettings,
    approvedMemoryRules: params.approvedMemoryRules,
    rejectedMemoryRuleCandidateSignatures:
      params.rejectedMemoryRuleCandidateSignatures,
    approvedMemoryRulesOverride: mergeApprovedRulesWithCandidate(
      params.candidate,
      params.approvedMemoryRulesOverride
    ),
    onAddPendingMemoryRuleCandidates: params.onAddPendingMemoryRuleCandidates,
  });
}

export async function runGptMemoryRejectedCandidateReapplyCycle(params: {
  currentState: KinMemoryState;
  settings: MemorySettings;
  memoryInterpreterSettings: MemoryInterpreterSettings;
  approvedMemoryRules: ApprovedMemoryRule[];
  rejectedMemoryRuleCandidateSignatures: string[];
  candidate: PendingMemoryRuleCandidate;
  rejectedMemoryRuleCandidateSignaturesOverride: string[];
  onAddPendingMemoryRuleCandidates: (
    candidates: PendingMemoryRuleCandidate[],
    approvedMemoryRulesOverride?: ApprovedMemoryRule[]
  ) => void;
}): Promise<{
  nextState: KinMemoryState | null;
  summaryUsage: TokenUsage | null;
}> {
  const updatedRecent = getReapplicableRecentMessages(params.currentState);
  if (updatedRecent.length === 0) {
    return { nextState: null, summaryUsage: null };
  }
  return runGptMemoryUpdateCycle({
    currentState: params.currentState,
    updatedRecent,
    settings: params.settings,
    memoryInterpreterSettings: params.memoryInterpreterSettings,
    approvedMemoryRules: params.approvedMemoryRules,
    rejectedMemoryRuleCandidateSignatures:
      params.rejectedMemoryRuleCandidateSignatures,
    currentMemoryOverride: buildRejectedCandidateReapplyMemory(
      params.currentState.memory,
      params.candidate
    ),
    rejectedMemoryRuleCandidateSignaturesOverride:
      params.rejectedMemoryRuleCandidateSignaturesOverride,
    onAddPendingMemoryRuleCandidates: params.onAddPendingMemoryRuleCandidates,
  });
}
