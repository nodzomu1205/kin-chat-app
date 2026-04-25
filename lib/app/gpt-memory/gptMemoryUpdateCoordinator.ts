import type { Memory, MemorySettings } from "@/lib/memory-domain/memory";
import type {
  ApprovedMemoryRule,
  MemoryInterpreterSettings,
  PendingMemoryRuleCandidate,
} from "@/lib/memory-domain/memoryInterpreterRules";
import type { MemoryUpdateOptions } from "@/hooks/chatPageActionTypes";
import type { KinMemoryState, Message } from "@/types/chat";
import type { TokenUsage } from "@/lib/app/gpt-memory/gptMemoryStateHelpers";
import { prepareCandidateMemoryUpdate } from "@/lib/app/gpt-memory/gptMemoryCandidatePreparation";
import { resolveMemoryCompressionState } from "@/lib/app/gpt-memory/gptMemorySummaryResolution";
import { resolveApprovedMemoryRules } from "@/lib/app/gpt-memory/gptMemoryFallback";
import { buildApprovedCandidateAdjudication } from "@/lib/app/gpt-memory/gptMemoryApproval";
import {
  buildRejectedCandidateReapplyMemory,
  getReapplicableRecentMessages,
  mergeApprovedRulesWithCandidate,
} from "@/lib/app/gpt-memory/gptMemoryReapply";

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
  suppressPendingCandidateQueue?: boolean;
}): Promise<{
  nextState: KinMemoryState;
  compressionUsage: TokenUsage | null;
  fallbackUsage: TokenUsage | null;
  fallbackUsageDetails: Record<string, unknown> | null;
  fallbackMetrics: {
    promptChars: number;
    rawReplyChars: number;
  } | null;
  fallbackDebug: {
    prompt: string;
    rawReply: string;
    parsed: unknown;
    usageDetails?: Record<string, unknown> | null;
  } | null;
}> {
  const currentMemory = params.currentMemoryOverride ?? params.currentState.memory;
  const activeApprovedRules = resolveApprovedMemoryRules(
    params.approvedMemoryRulesOverride,
    params.approvedMemoryRules
  );
  const {
    trimmedRecent,
    candidateMemory,
    needsSummary,
    filteredPendingCandidates,
    fallbackUsage,
    fallbackUsageDetails,
    fallbackMetrics,
    fallbackDebug,
  } =
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

  if (!params.suppressPendingCandidateQueue && filteredPendingCandidates.length > 0) {
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
        compressionUsage: null,
        fallbackUsage: fallbackUsage ?? null,
        fallbackUsageDetails: fallbackUsageDetails ?? null,
        fallbackMetrics: fallbackMetrics ?? null,
        fallbackDebug: fallbackDebug ?? null,
      };
  }

  const result = await resolveMemoryCompressionState({
    candidateMemory,
    trimmedRecent,
    settings: params.settings,
  });

  return {
    nextState: result.nextState,
    compressionUsage: result.compressionUsage,
    fallbackUsage: fallbackUsage ?? null,
    fallbackUsageDetails: fallbackUsageDetails ?? null,
    fallbackMetrics: fallbackMetrics ?? null,
    fallbackDebug: fallbackDebug ?? null,
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
  compressionUsage: TokenUsage | null;
  fallbackUsage: TokenUsage | null;
  fallbackUsageDetails: Record<string, unknown> | null;
  fallbackMetrics: {
    promptChars: number;
    rawReplyChars: number;
  } | null;
  fallbackDebug: {
    prompt: string;
    rawReply: string;
    parsed: unknown;
    usageDetails?: Record<string, unknown> | null;
  } | null;
}> {
  const updatedRecent = getReapplicableRecentMessages(params.currentState);
  if (updatedRecent.length === 0) {
    return {
      nextState: null,
      compressionUsage: null,
      fallbackUsage: null,
      fallbackUsageDetails: null,
      fallbackMetrics: null,
      fallbackDebug: null,
    };
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
  compressionUsage: TokenUsage | null;
  fallbackUsage: TokenUsage | null;
  fallbackUsageDetails: Record<string, unknown> | null;
  fallbackMetrics: {
    promptChars: number;
    rawReplyChars: number;
  } | null;
  fallbackDebug: {
    prompt: string;
    rawReply: string;
    parsed: unknown;
    usageDetails?: Record<string, unknown> | null;
  } | null;
}> {
  const updatedRecent = getReapplicableRecentMessages(params.currentState);
  if (updatedRecent.length === 0) {
    return {
      nextState: null,
      compressionUsage: null,
      fallbackUsage: null,
      fallbackUsageDetails: null,
      fallbackMetrics: null,
      fallbackDebug: null,
    };
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
    suppressPendingCandidateQueue: true,
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
  compressionUsage: TokenUsage | null;
  fallbackUsage: TokenUsage | null;
  fallbackUsageDetails: Record<string, unknown> | null;
  fallbackMetrics: {
    promptChars: number;
    rawReplyChars: number;
  } | null;
  fallbackDebug: {
    prompt: string;
    rawReply: string;
    parsed: unknown;
    usageDetails?: Record<string, unknown> | null;
  } | null;
}> {
  const updatedRecent = getReapplicableRecentMessages(params.currentState);
  if (updatedRecent.length === 0) {
    return {
      nextState: null,
      compressionUsage: null,
      fallbackUsage: null,
      fallbackUsageDetails: null,
      fallbackMetrics: null,
      fallbackDebug: null,
    };
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

