import type { Memory } from "@/lib/memory";
import type {
  ApprovedMemoryRule,
  MemoryInterpreterSettings,
  PendingMemoryRuleCandidate,
} from "@/lib/memoryInterpreterRules";
import {
  buildInterpretedMemoryState,
} from "@/lib/app/memoryInterpreterStateAssembly";
import {
  orchestrateMemoryFallback,
} from "@/lib/app/memoryInterpreterFallbackOrchestrator";
import type { Message } from "@/types/chat";
import type { MemoryTopicAdjudication } from "@/lib/app/memoryTopicAdjudication";

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
  debug?: {
    prompt: string;
    rawReply: string;
    parsed: unknown;
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
