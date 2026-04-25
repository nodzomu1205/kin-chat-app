import type { Memory, MemorySettings } from "@/lib/memory";
import type {
  ApprovedMemoryRule,
  MemoryInterpreterSettings,
  PendingMemoryRuleCandidate,
} from "@/lib/memoryInterpreterRules";
import type { MemoryUpdateOptions } from "@/hooks/chatPageActionTypes";
import type { TokenUsage } from "@/lib/app/gpt-memory/gptMemoryStateHelpers";
import type { KinMemoryState, Message } from "@/types/chat";
import {
  loadStoredGptMemorySettings,
  loadStoredKinMemoryMap,
  resolveActiveKinMemoryState,
} from "@/lib/app/gpt-memory/gptMemoryStoreCoordinator";
import {
  runGptMemoryApprovedCandidateReapplyCycle,
  runGptMemoryApprovedRulesReapplyCycle,
  runGptMemoryRejectedCandidateReapplyCycle,
  runGptMemoryUpdateCycle,
} from "@/lib/app/gpt-memory/gptMemoryUpdateCoordinator";

export type GptMemoryRuntimeConfig = {
  memoryInterpreterSettings: MemoryInterpreterSettings;
  approvedMemoryRules: ApprovedMemoryRule[];
  rejectedMemoryRuleCandidateSignatures: string[];
  onAddPendingMemoryRuleCandidates: (
    candidates: PendingMemoryRuleCandidate[],
    approvedMemoryRulesOverride?: ApprovedMemoryRule[]
  ) => void;
};

export type GptMemoryCycleResult = {
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
};

export function loadInitialGptMemoryRuntimeState(currentKin: string | null) {
  const settings = loadStoredGptMemorySettings();
  const kinMemoryMap = loadStoredKinMemoryMap(settings);
  const gptState = resolveActiveKinMemoryState(currentKin, kinMemoryMap, settings);

  return {
    settings,
    kinMemoryMap,
    gptState,
  };
}

export function runGptMemoryRuntimeUpdate(params: {
  currentState: KinMemoryState;
  updatedRecent: Message[];
  settings: MemorySettings;
  config: GptMemoryRuntimeConfig;
  options?: MemoryUpdateOptions;
  runtimeConfig?: {
    approvedMemoryRules?: ApprovedMemoryRule[];
    rejectedMemoryRuleCandidateSignatures?: string[];
    currentMemoryOverride?: Memory;
  };
}): Promise<GptMemoryCycleResult> {
  return runGptMemoryUpdateCycle({
    currentState: params.currentState,
    updatedRecent: params.updatedRecent,
    settings: params.settings,
    options: params.options,
    memoryInterpreterSettings: params.config.memoryInterpreterSettings,
    approvedMemoryRules: params.config.approvedMemoryRules,
    rejectedMemoryRuleCandidateSignatures:
      params.config.rejectedMemoryRuleCandidateSignatures,
    approvedMemoryRulesOverride: params.runtimeConfig?.approvedMemoryRules,
    rejectedMemoryRuleCandidateSignaturesOverride:
      params.runtimeConfig?.rejectedMemoryRuleCandidateSignatures,
    currentMemoryOverride: params.runtimeConfig?.currentMemoryOverride,
    onAddPendingMemoryRuleCandidates:
      params.config.onAddPendingMemoryRuleCandidates,
  });
}

export function runGptMemoryRuntimeApprovedRulesReapply(params: {
  currentState: KinMemoryState;
  settings: MemorySettings;
  config: GptMemoryRuntimeConfig;
  approvedMemoryRulesOverride: ApprovedMemoryRule[];
}): Promise<GptMemoryCycleResult> {
  return runGptMemoryApprovedRulesReapplyCycle({
    currentState: params.currentState,
    settings: params.settings,
    memoryInterpreterSettings: params.config.memoryInterpreterSettings,
    approvedMemoryRules: params.config.approvedMemoryRules,
    rejectedMemoryRuleCandidateSignatures:
      params.config.rejectedMemoryRuleCandidateSignatures,
    approvedMemoryRulesOverride: params.approvedMemoryRulesOverride,
    onAddPendingMemoryRuleCandidates:
      params.config.onAddPendingMemoryRuleCandidates,
  });
}

export function runGptMemoryRuntimeApprovedCandidateReapply(params: {
  currentState: KinMemoryState;
  settings: MemorySettings;
  config: GptMemoryRuntimeConfig;
  candidate: PendingMemoryRuleCandidate;
  approvedMemoryRulesOverride: ApprovedMemoryRule[];
}): Promise<GptMemoryCycleResult> {
  return runGptMemoryApprovedCandidateReapplyCycle({
    currentState: params.currentState,
    settings: params.settings,
    memoryInterpreterSettings: params.config.memoryInterpreterSettings,
    approvedMemoryRules: params.config.approvedMemoryRules,
    rejectedMemoryRuleCandidateSignatures:
      params.config.rejectedMemoryRuleCandidateSignatures,
    candidate: params.candidate,
    approvedMemoryRulesOverride: params.approvedMemoryRulesOverride,
    onAddPendingMemoryRuleCandidates:
      params.config.onAddPendingMemoryRuleCandidates,
  });
}

export function runGptMemoryRuntimeRejectedCandidateReapply(params: {
  currentState: KinMemoryState;
  settings: MemorySettings;
  config: GptMemoryRuntimeConfig;
  candidate: PendingMemoryRuleCandidate;
  rejectedMemoryRuleCandidateSignaturesOverride: string[];
}): Promise<GptMemoryCycleResult> {
  return runGptMemoryRejectedCandidateReapplyCycle({
    currentState: params.currentState,
    settings: params.settings,
    memoryInterpreterSettings: params.config.memoryInterpreterSettings,
    approvedMemoryRules: params.config.approvedMemoryRules,
    rejectedMemoryRuleCandidateSignatures:
      params.config.rejectedMemoryRuleCandidateSignatures,
    candidate: params.candidate,
    rejectedMemoryRuleCandidateSignaturesOverride:
      params.rejectedMemoryRuleCandidateSignaturesOverride,
    onAddPendingMemoryRuleCandidates:
      params.config.onAddPendingMemoryRuleCandidates,
  });
}

