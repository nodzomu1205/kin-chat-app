import type { MemorySettings } from "@/lib/memory";
import type { TokenUsage } from "@/hooks/useGptMemory";
import type { LocalMemorySettingsInput } from "./gptPanelTypes";

export function formatNumber(value: number) {
  return new Intl.NumberFormat("ja-JP").format(value);
}

export function sumUsages(usages: TokenUsage[]): TokenUsage {
  return usages.reduce(
    (acc, usage) => ({
      inputTokens: acc.inputTokens + usage.inputTokens,
      outputTokens: acc.outputTokens + usage.outputTokens,
      totalTokens: acc.totalTokens + usage.totalTokens,
    }),
    {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    }
  );
}

export function mergeUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    totalTokens: a.totalTokens + b.totalTokens,
  };
}

export function memorySettingsToInput(
  settings: MemorySettings
): LocalMemorySettingsInput {
  return {
    maxFacts: String(settings.maxFacts),
    maxPreferences: String(settings.maxPreferences),
    chatRecentLimit: String(settings.chatRecentLimit),
    summarizeThreshold: String(settings.summarizeThreshold),
    recentKeep: String(settings.recentKeep),
  };
}

export function normalizeLocalSettings(input: LocalMemorySettingsInput): MemorySettings {
  const raw = {
    maxFacts: Number(input.maxFacts || 0),
    maxPreferences: Number(input.maxPreferences || 0),
    chatRecentLimit: Number(input.chatRecentLimit || 0),
    summarizeThreshold: Number(input.summarizeThreshold || 0),
    recentKeep: Number(input.recentKeep || 0),
  };

  const chatRecentLimit = Math.max(2, Math.floor(raw.chatRecentLimit || 0));
  const recentKeep = Math.max(
    1,
    Math.min(Math.floor(raw.recentKeep || 0), chatRecentLimit)
  );
  const summarizeThreshold = Math.max(
    2,
    Math.floor(raw.summarizeThreshold || 0),
    recentKeep
  );

  return {
    maxFacts: Math.max(1, Math.floor(raw.maxFacts || 0)),
    maxPreferences: Math.max(1, Math.floor(raw.maxPreferences || 0)),
    chatRecentLimit,
    summarizeThreshold,
    recentKeep,
  };
}
