import type { Memory, MemorySettings } from "@/lib/memory";
import type { Message } from "@/types/chat";

export function shouldSummarizeMemoryUpdate(params: {
  trimmedRecent: Message[];
  candidateMemory: Memory;
  settings: MemorySettings;
}) {
  const { trimmedRecent, candidateMemory, settings } = params;
  const memoryCapacity =
    settings.chatRecentLimit + settings.maxFacts + settings.maxPreferences;
  const recentEligible = trimmedRecent.length >= settings.summarizeThreshold;
  const recentIsFull = trimmedRecent.length >= settings.chatRecentLimit;
  const totalPressure =
    trimmedRecent.length +
    candidateMemory.facts.length +
    candidateMemory.preferences.length;
  const memoryIsOverCapacity = totalPressure > memoryCapacity;

  return (
    (recentEligible && recentIsFull) ||
    (recentEligible && memoryIsOverCapacity)
  );
}
