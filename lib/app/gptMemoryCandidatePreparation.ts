import type { Memory, MemorySettings } from "@/lib/memory";
import type { ApprovedMemoryRule, MemoryInterpreterSettings } from "@/lib/memoryInterpreterRules";
import type { MemoryUpdateOptions } from "@/hooks/chatPageActionTypes";
import type { Message } from "@/types/chat";
import { type TokenUsage } from "@/lib/app/gptMemoryStateHelpers";
import { buildCandidateMemoryState } from "@/lib/app/gptMemoryStateCandidate";
import { shouldSummarizeMemoryUpdate } from "@/lib/app/gptMemorySummarizePolicy";
import {
  applyMemoryTopicAdjudication,
  filterPendingMemoryRuleCandidates,
  suppressRejectedFallbackOptions,
} from "@/lib/app/gptMemoryFallback";
import { resolveMemoryFallbackOptions } from "@/lib/app/memoryInterpreter";

export async function prepareCandidateMemoryUpdate(params: {
  currentMemory: Memory;
  updatedRecent: Message[];
  settings: MemorySettings;
  options?: MemoryUpdateOptions;
  memoryInterpreterSettings: MemoryInterpreterSettings;
  approvedRules: ApprovedMemoryRule[];
  rejectedMemoryRuleCandidateSignatures: string[];
}): Promise<{
  trimmedRecent: Message[];
  candidateMemory: Memory;
  needsSummary: boolean;
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
  filteredPendingCandidates: Awaited<
    ReturnType<typeof resolveMemoryFallbackOptions>
  >["pendingCandidates"];
}> {
  const latestUser = [...params.updatedRecent]
    .reverse()
    .find((message) => message.role === "user");
  const latestUserText = typeof latestUser?.text === "string" ? latestUser.text : "";

  const fallbackResult = latestUserText
    ? await resolveMemoryFallbackOptions({
        latestUserText,
        recentMessages: params.updatedRecent,
        currentMemory: params.currentMemory,
        settings: params.memoryInterpreterSettings,
        approvedRules: params.approvedRules,
      })
    : {
        adjudication: {},
        pendingCandidates: [],
        usedFallback: false,
        fallbackUsage: null,
        fallbackUsageDetails: null,
        fallbackMetrics: null,
        debug: undefined,
      };

  const effectiveFallbackResult = suppressRejectedFallbackOptions({
    fallbackResult,
    rejectedSignatures: params.rejectedMemoryRuleCandidateSignatures,
  });

  const filteredPendingCandidates = filterPendingMemoryRuleCandidates(
    effectiveFallbackResult.pendingCandidates,
    params.rejectedMemoryRuleCandidateSignatures
  );

  const memoryUpdateOptions = applyMemoryTopicAdjudication(
    params.options,
    effectiveFallbackResult.adjudication
  );
  const { trimmedRecent, candidateMemory } = buildCandidateMemoryState({
    currentMemory: params.currentMemory,
    updatedRecent: params.updatedRecent,
    settings: params.settings,
    options: memoryUpdateOptions,
  });
  const needsSummary = shouldSummarizeMemoryUpdate({
    trimmedRecent,
    candidateMemory,
    settings: params.settings,
  });

  return {
    trimmedRecent,
    candidateMemory,
    needsSummary,
    compressionUsage: null,
    fallbackUsage: effectiveFallbackResult.fallbackUsage ?? null,
    fallbackUsageDetails: effectiveFallbackResult.fallbackUsageDetails ?? null,
    fallbackMetrics: effectiveFallbackResult.fallbackMetrics ?? null,
    fallbackDebug: effectiveFallbackResult.debug ?? null,
    filteredPendingCandidates,
  };
}

