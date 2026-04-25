import type { Memory, MemorySettings } from "@/lib/memory";
import type { Message } from "@/types/chat";

export function shouldSummarizeMemoryUpdate(params: {
  trimmedRecent: Message[];
  candidateMemory: Memory;
  settings: MemorySettings;
}) {
  const { trimmedRecent, settings } = params;
  return trimmedRecent.length >= settings.summarizeThreshold;
}

