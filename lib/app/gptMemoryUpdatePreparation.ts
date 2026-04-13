import type { Memory, MemorySettings } from "@/lib/memory";
import type { ApprovedMemoryRule, MemoryInterpreterSettings } from "@/lib/memoryInterpreterRules";
import type { MemoryUpdateOptions } from "@/hooks/useChatPageActions";
import type { Message } from "@/types/chat";
import { buildCandidateMemoryState, type TokenUsage } from "@/lib/app/gptMemoryStateHelpers";
import { shouldSummarizeMemoryUpdate } from "@/lib/app/gptMemorySummarizePolicy";
import {
  buildMemoryUpdateOptionsFromFallback,
  filterPendingMemoryRuleCandidates,
} from "@/lib/app/gptMemoryFallback";
import { resolveMemoryFallbackOptions } from "@/lib/app/memoryInterpreter";

export async function prepareMemoryUpdate(params: {
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
  summaryUsage: TokenUsage | null;
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
        currentMemory: params.currentMemory,
        settings: params.memoryInterpreterSettings,
        approvedRules: params.approvedRules,
      })
    : { optionsPatch: {}, pendingCandidates: [], usedFallback: false };

  const filteredPendingCandidates = filterPendingMemoryRuleCandidates(
    fallbackResult.pendingCandidates,
    params.rejectedMemoryRuleCandidateSignatures
  );

  const memoryUpdateOptions = buildMemoryUpdateOptionsFromFallback(
    params.options,
    fallbackResult
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
    summaryUsage: null,
    filteredPendingCandidates,
  };
}
