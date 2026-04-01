import type React from "react";
import type { KinMemoryState, Message } from "@/types/chat";
import type { MemorySettings } from "@/lib/memory";
import type { TokenUsage } from "@/hooks/useGptMemory";

export type GptInstructionMode =
  | "normal"
  | "translate_explain"
  | "reply_only"
  | "polish";

export type ResponseMode = "strict" | "creative";

export type TokenStats = {
  lastChatUsage: TokenUsage | null;
  recentChatUsages: TokenUsage[];
  threadChatTotal: TokenUsage;
  lastSummaryUsage: TokenUsage | null;
  threadSummaryTotal: TokenUsage;
  summaryRunCount: number;
};

export type GptPanelProps = {
  currentKin: string | null;
  currentKinLabel: string | null;
  kinStatus: "idle" | "connected" | "error";
  gptState: KinMemoryState;
  gptMessages: Message[];
  gptInput: string;
  setGptInput: (value: string) => void;
  sendToGpt: (mode?: GptInstructionMode) => void;
  resetGptForCurrentKin: () => void;
  sendLastGptToKinDraft: () => void;
  loading: boolean;
  gptBottomRef: React.RefObject<HTMLDivElement | null>;
  memorySettings: MemorySettings;
  defaultMemorySettings: MemorySettings;
  onSaveMemorySettings: (next: MemorySettings) => void;
  onResetMemorySettings: () => void;
  tokenStats: TokenStats;
  responseMode: ResponseMode;
  onChangeResponseMode: (mode: ResponseMode) => void;
  onSwitchPanel?: () => void;
  isMobile?: boolean;
};

export type LocalMemorySettingsInput = {
  maxFacts: string;
  maxPreferences: string;
  chatRecentLimit: string;
  summarizeThreshold: string;
  recentKeep: string;
};
