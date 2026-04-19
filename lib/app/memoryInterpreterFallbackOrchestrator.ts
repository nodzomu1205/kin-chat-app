import type { Memory } from "@/lib/memory";
import type {
  ApprovedMemoryRule,
  MemoryInterpreterSettings,
  PendingMemoryRuleCandidate,
} from "@/lib/memoryInterpreterRules";
import { hasStrongApprovedMemoryRuleMatch } from "@/lib/app/memoryInterpreterPatternMemory";
import { applyApprovedMemoryRule } from "@/lib/app/memoryInterpreterFallbackHelpers";
import { isSearchDirectiveText, normalizeText } from "@/lib/app/memoryInterpreterText";
import { resolveMemoryFallbackFlow } from "@/lib/app/memoryInterpreterFallbackFlow";
import type { Message } from "@/types/chat";
import type { MemoryTopicAdjudication } from "@/lib/app/memoryTopicAdjudication";

export type MemoryFallbackOrchestrationResult = {
  adjudication: MemoryTopicAdjudication;
  pendingCandidates: PendingMemoryRuleCandidate[];
  usedFallback: boolean;
  fallbackUsage?: import("@/lib/app/gptMemoryStateHelpers").TokenUsage | null;
  debug?: {
    prompt: string;
    rawReply: string;
    parsed: unknown;
  };
};

export function resolveApprovedMemoryRuleAdjudication(args: {
  latestUserText: string;
  approvedRules: ApprovedMemoryRule[];
}): MemoryTopicAdjudication {
  if (!hasStrongApprovedMemoryRuleMatch(args.latestUserText, args.approvedRules)) {
    return {};
  }
  return applyApprovedMemoryRule(args.latestUserText, args.approvedRules);
}

export function shouldRunMemoryFallback(args: {
  latestUserText: string;
  currentMemory: Memory;
  settings: MemoryInterpreterSettings;
  approvedRules?: ApprovedMemoryRule[];
}) {
  if (
    args.approvedRules &&
    hasStrongApprovedMemoryRuleMatch(args.latestUserText, args.approvedRules)
  ) {
    return false;
  }
  if (!args.settings.llmFallbackEnabled) return false;
  const normalized = normalizeText(args.latestUserText);
  if (!normalized) return false;
  if (isSearchDirectiveText(normalized)) return false;
  return true;
}

export async function orchestrateMemoryFallback(args: {
  latestUserText: string;
  recentMessages: Message[];
  currentMemory: Memory;
  settings: MemoryInterpreterSettings;
  approvedRules: ApprovedMemoryRule[];
}): Promise<MemoryFallbackOrchestrationResult> {
  const approvedAdjudication = resolveApprovedMemoryRuleAdjudication({
    latestUserText: args.latestUserText,
    approvedRules: args.approvedRules,
  });
  if (Object.keys(approvedAdjudication).length > 0) {
    return {
      adjudication: approvedAdjudication,
      pendingCandidates: [],
      usedFallback: false,
      fallbackUsage: null,
    };
  }

  if (
    !shouldRunMemoryFallback({
      latestUserText: args.latestUserText,
      currentMemory: args.currentMemory,
      settings: args.settings,
      approvedRules: args.approvedRules,
    })
  ) {
    return {
      adjudication: {},
      pendingCandidates: [],
      usedFallback: false,
      fallbackUsage: null,
    };
  }

  return resolveMemoryFallbackFlow({
    latestUserText: args.latestUserText,
    recentMessages: args.recentMessages,
    currentMemory: args.currentMemory,
    settings: args.settings,
  });
}
