import type { TokenUsage } from "@/hooks/useGptMemory";

export type TokenStats = {
  lastChatUsage: TokenUsage | null;
  recentChatUsages: TokenUsage[];
  threadChatTotal: TokenUsage;
  lastSummaryUsage: TokenUsage | null;
  threadSummaryTotal: TokenUsage;
  summaryRunCount: number;
  lastSearchUsage: TokenUsage | null;
  threadSearchTotal: TokenUsage;
  searchRunCount: number;
  lastTaskUsage: TokenUsage | null;
  threadTaskTotal: TokenUsage;
  taskRunCount: number;
  lastIngestUsage: TokenUsage | null;
  threadIngestTotal: TokenUsage;
  ingestRunCount: number;
};

export const emptyUsage = (): TokenUsage => ({
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
});

export const emptyTokenStats = (): TokenStats => ({
  lastChatUsage: null,
  recentChatUsages: [],
  threadChatTotal: emptyUsage(),
  lastSummaryUsage: null,
  threadSummaryTotal: emptyUsage(),
  summaryRunCount: 0,
  lastSearchUsage: null,
  threadSearchTotal: emptyUsage(),
  searchRunCount: 0,
  lastTaskUsage: null,
  threadTaskTotal: emptyUsage(),
  taskRunCount: 0,
  lastIngestUsage: null,
  threadIngestTotal: emptyUsage(),
  ingestRunCount: 0,
});

export const normalizeUsage = (
  usage: TokenUsage | null | undefined
): TokenUsage => {
  if (!usage) return emptyUsage();

  return {
    inputTokens: typeof usage.inputTokens === "number" ? usage.inputTokens : 0,
    outputTokens: typeof usage.outputTokens === "number" ? usage.outputTokens : 0,
    totalTokens:
      typeof usage.totalTokens === "number"
        ? usage.totalTokens
        : (usage.inputTokens || 0) + (usage.outputTokens || 0),
  };
};
