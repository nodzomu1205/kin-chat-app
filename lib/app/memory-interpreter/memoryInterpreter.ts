import type { Memory } from "@/lib/memory-domain/memory";
import type {
  ApprovedMemoryRule,
  MemoryInterpreterSettings,
  PendingMemoryRuleCandidate,
} from "@/lib/memory-domain/memoryInterpreterRules";
import {
  buildInterpretedMemoryState,
} from "@/lib/app/memory-interpreter/memoryInterpreterStateAssembly";
import {
  orchestrateMemoryFallback,
} from "@/lib/app/memory-interpreter/memoryInterpreterFallbackOrchestrator";
import type { Message } from "@/types/chat";
import type { MemoryTopicAdjudication } from "@/lib/app/memory-rules/memoryTopicAdjudication";
import type { TokenUsage } from "@/lib/app/gpt-memory/gptMemoryStateHelpers";

export type MemoryInterpreterOptions = {
  topicAdjudication?: MemoryTopicAdjudication;
  currentTaskTitleOverride?: string;
  lastUserIntent?: string;
  activeDocument?: Record<string, unknown> | null;
};

type MemoryInterpretationInput = {
  currentMemory: Memory;
  recentMessages: Message[];
  options?: MemoryInterpreterOptions;
};

export function interpretMemoryState(input: MemoryInterpretationInput): Partial<Memory> {
  return buildInterpretedMemoryState(input);
}


export async function resolveMemoryFallbackOptions(args: {
  latestUserText: string;
  recentMessages: Message[];
  currentMemory: Memory;
  settings: MemoryInterpreterSettings;
  approvedRules: ApprovedMemoryRule[];
}): Promise<{
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
  };
}> {
  return orchestrateMemoryFallback({
    latestUserText: args.latestUserText,
    recentMessages: args.recentMessages,
    currentMemory: args.currentMemory,
    settings: args.settings,
    approvedRules: args.approvedRules,
  });
}
