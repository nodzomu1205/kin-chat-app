import type React from "react";
import type { MemorySettings } from "@/lib/memory-domain/memory";
import type { KinMemoryState, Message } from "@/types/chat";
import type { MemoryUpdateOptions } from "@/hooks/chatPageActionTypes";
import type { normalizeUsage } from "@/lib/shared/tokenStats";

export type GptMemoryRuntime = {
  gptStateRef: React.MutableRefObject<KinMemoryState>;
  setGptState: React.Dispatch<React.SetStateAction<KinMemoryState>>;
  persistCurrentGptState: (state: KinMemoryState) => void;
  handleGptMemory: (
    recent: Message[],
    options?: MemoryUpdateOptions
  ) => Promise<{
    compressionUsage: Parameters<typeof normalizeUsage>[0] | null;
    fallbackUsage: Parameters<typeof normalizeUsage>[0] | null;
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
  }>;
  chatRecentLimit: number;
  clearTaskScopedMemory: () => void;
  resetGptForCurrentKin: () => void;
};

export type GptMemorySettingsControls = {
  updateMemorySettings: (next: MemorySettings) => void;
  resetMemorySettings: () => void;
};

export function buildChatPageGptMemoryRuntime(params: GptMemoryRuntime): GptMemoryRuntime {
  return params;
}

export function buildChatPageGptMemorySettingsControls(
  params: GptMemorySettingsControls
): GptMemorySettingsControls {
  return params;
}

