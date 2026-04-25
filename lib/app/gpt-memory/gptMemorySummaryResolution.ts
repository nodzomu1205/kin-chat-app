import { type MemorySettings } from "@/lib/memory";
import {
  normalizeTokenUsage,
  type TokenUsage,
} from "@/lib/app/gpt-memory/gptMemoryStateHelpers";
import type { KinMemoryState, Message } from "@/types/chat";
import type { Memory } from "@/lib/memory";

function buildCompactedRecentMessages(args: {
  trimmedRecent: Message[];
  compactedText: string;
  recentKeep: number;
}) {
  const keptRecent = args.trimmedRecent.slice(-args.recentKeep);
  const overflow = Math.max(0, args.trimmedRecent.length - keptRecent.length);
  const compactedText = args.compactedText.trim();

  if (!compactedText || overflow <= 0) {
    return keptRecent;
  }

  return [
    {
      id: `memory-compact-${Date.now()}`,
      role: "gpt" as const,
      text: `[Conversation compaction]\n${compactedText}`,
      meta: {
        kind: "task_info" as const,
        sourceType: "manual" as const,
      },
    },
    ...keptRecent,
  ];
}

export async function resolveMemoryCompressionState(params: {
  candidateMemory: Memory;
  trimmedRecent: Message[];
  settings: MemorySettings;
}): Promise<{
  nextState: KinMemoryState;
  compressionUsage: TokenUsage | null;
}> {
  try {
    const response = await fetch("/api/chatgpt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "compact_recent",
        memory: params.candidateMemory,
        messages: params.trimmedRecent,
        recentKeep: params.settings.recentKeep,
      }),
    });

    if (!response.ok) {
      throw new Error(`summarize failed: ${response.status}`);
    }

    const data = await response.json();

    return {
      nextState: {
        memory: params.candidateMemory,
        recentMessages: buildCompactedRecentMessages({
          trimmedRecent: params.trimmedRecent,
          compactedText:
            typeof data?.compactedText === "string" ? data.compactedText : "",
          recentKeep: params.settings.recentKeep,
        }),
      },
      compressionUsage: normalizeTokenUsage(data?.usage),
    };
  } catch (error) {
    console.error("gpt memory summarize failed", error);

    return {
      nextState: {
        memory: params.candidateMemory,
        recentMessages: params.trimmedRecent,
      },
      compressionUsage: null,
    };
  }
}

