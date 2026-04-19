import {
  getMemoryRulePhraseSignature,
  getMemoryRuleSignature,
} from "@/lib/memoryInterpreterRules";
import type {
  ApprovedMemoryRule,
  PendingMemoryRuleCandidate,
} from "@/lib/memoryInterpreterRules";
import type { MemoryUpdateOptions } from "@/hooks/chatPageActionTypes";
import type { MemoryTopicAdjudication } from "@/lib/app/memoryTopicAdjudication";
import { normalizeText } from "@/lib/app/memoryInterpreterText";
import type { TokenUsage } from "@/lib/app/gptMemoryStateHelpers";

export type MemoryFallbackResult = {
  adjudication: MemoryTopicAdjudication;
  pendingCandidates: PendingMemoryRuleCandidate[];
  usedFallback: boolean;
  fallbackUsage?: TokenUsage | null;
  fallbackUsageDetails?: Record<string, unknown> | null;
  fallbackMetrics?: {
    promptChars: number;
    rawReplyChars: number;
  } | null;
  debug?: {
    prompt: string;
    rawReply: string;
    parsed: unknown;
    usageDetails?: Record<string, unknown> | null;
  } | null;
};

export function filterPendingMemoryRuleCandidates(
  candidates: PendingMemoryRuleCandidate[],
  rejectedSignatures: string[]
) {
  return candidates.filter((candidate) => {
    const signature = getMemoryRuleSignature(candidate);
    const phraseSignature = getMemoryRulePhraseSignature(candidate);
    return (
      !rejectedSignatures.includes(signature) &&
      !rejectedSignatures.includes(phraseSignature)
    );
  });
}

export function applyMemoryTopicAdjudication(
  baseOptions: MemoryUpdateOptions | undefined,
  adjudication: MemoryTopicAdjudication
): MemoryUpdateOptions {
  return {
    ...baseOptions,
    topicAdjudication: {
      ...(baseOptions?.topicAdjudication || {}),
      ...adjudication,
    },
  };
}

export function suppressRejectedFallbackOptions(args: {
  fallbackResult: MemoryFallbackResult;
  rejectedSignatures: string[];
}) {
  if (args.rejectedSignatures.length === 0) {
    return args.fallbackResult;
  }

  const nextAdjudication = { ...args.fallbackResult.adjudication };
  const committedTopic = normalizeText(String(nextAdjudication.committedTopic || ""));
  const matchingTopicCandidates = args.fallbackResult.pendingCandidates.filter((candidate) => {
    const candidateValue = normalizeText(candidate.normalizedValue || candidate.phrase);
    return Boolean(committedTopic) && candidateValue === committedTopic;
  });
  const hasRejectedMatchingCandidate = matchingTopicCandidates.some((candidate) =>
    args.rejectedSignatures.includes(getMemoryRuleSignature(candidate)) ||
    args.rejectedSignatures.includes(getMemoryRulePhraseSignature(candidate))
  );
  const hasNonRejectedMatchingCandidate = matchingTopicCandidates.some((candidate) => {
    const signature = getMemoryRuleSignature(candidate);
    const phraseSignature = getMemoryRulePhraseSignature(candidate);
    return (
      !args.rejectedSignatures.includes(signature) &&
      !args.rejectedSignatures.includes(phraseSignature)
    );
  });
  const committedTopicRejected =
    Boolean(committedTopic) &&
    hasRejectedMatchingCandidate &&
    !hasNonRejectedMatchingCandidate;

  if (committedTopicRejected) {
    delete nextAdjudication.committedTopic;
    delete nextAdjudication.trackedEntityOverride;
  }

  return {
    ...args.fallbackResult,
    adjudication: nextAdjudication,
  };
}

export function resolveApprovedMemoryRules(
  runtimeApprovedRules: ApprovedMemoryRule[] | undefined,
  configuredApprovedRules: ApprovedMemoryRule[]
) {
  return runtimeApprovedRules ?? configuredApprovedRules;
}
