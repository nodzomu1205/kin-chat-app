import type React from "react";
import type { Message } from "@/types/chat";
import type { MemoryUpdateOptions } from "@/hooks/chatPageActionTypes";
import type { normalizeUsage } from "@/lib/tokenStats";

export type GptMemoryRuntime = {
  gptStateRef: React.MutableRefObject<any>;
  setGptState: React.Dispatch<React.SetStateAction<any>>;
  persistCurrentGptState: (state: any) => void;
  handleGptMemory: (
    recent: Message[],
    options?: MemoryUpdateOptions
  ) => Promise<{ summaryUsage: Parameters<typeof normalizeUsage>[0] | null }>;
  chatRecentLimit: number;
  clearTaskScopedMemory: () => void;
  resetGptForCurrentKin: () => void;
};

export type GptMemorySettingsControls = {
  updateMemorySettings: (next: any) => void;
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
