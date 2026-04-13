import { normalizeMemoryShape, type MemorySettings } from "@/lib/memory";
import {
  hasMeaningfulMemoryState,
  mergeSummarizedMemoryState,
  normalizeTokenUsage,
  trimMemoryState,
  type TokenUsage,
} from "@/lib/app/gptMemoryStateHelpers";
import type { KinMemoryState, Message } from "@/types/chat";
import type { Memory } from "@/lib/memory";

export async function resolveSummarizedMemoryState(params: {
  candidateMemory: Memory;
  trimmedRecent: Message[];
  settings: MemorySettings;
}): Promise<{
  nextState: KinMemoryState;
  summaryUsage: TokenUsage | null;
}> {
  try {
    const response = await fetch("/api/chatgpt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "summarize",
        memory: params.candidateMemory,
        messages: params.trimmedRecent,
      }),
    });

    if (!response.ok) {
      throw new Error(`summarize failed: ${response.status}`);
    }

    const data = await response.json();
    const summarizedCandidate = trimMemoryState(
      normalizeMemoryShape(data?.memory),
      params.settings
    );
    const nextMemory = hasMeaningfulMemoryState(summarizedCandidate)
      ? mergeSummarizedMemoryState({
          candidateMemory: params.candidateMemory,
          summarizedCandidate,
          settings: params.settings,
          recentMessages: params.trimmedRecent,
        })
      : params.candidateMemory;

    return {
      nextState: {
        memory: nextMemory,
        recentMessages: params.trimmedRecent.slice(-params.settings.recentKeep),
      },
      summaryUsage: normalizeTokenUsage(data?.usage),
    };
  } catch (error) {
    console.error("gpt memory summarize failed", error);

    return {
      nextState: {
        memory: params.candidateMemory,
        recentMessages: params.trimmedRecent,
      },
      summaryUsage: null,
    };
  }
}
