import type { TokenUsage } from "@/hooks/useGptMemory";
import type { ChatPromptMetrics } from "@/lib/shared/chatPromptMetrics";
import { normalizeChatPromptMetrics } from "@/lib/shared/chatPromptMetrics";

export type TokenStats = {
  lastChatUsage: TokenUsage | null;
  lastChatUsageDetails: Record<string, unknown> | null;
  lastChatPromptMetrics: ChatPromptMetrics | null;
  lastChatFollowupMetrics: {
    promptChars: number;
    rawReplyChars: number;
  } | null;
  lastChatFollowupUsageDetails: Record<string, unknown> | null;
  lastChatFollowupDebug: {
    prompt: string;
    rawReply: string;
    parsed: unknown;
    usageDetails?: Record<string, unknown> | null;
  } | null;
  recentChatUsages: TokenUsage[];
  threadChatTotal: TokenUsage;
  lastCompressionUsage: TokenUsage | null;
  threadCompressionTotal: TokenUsage;
  compressionRunCount: number;
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

export type DisplayTokenStats = TokenStats & {
  latestInput: number;
  latestOutput: number;
  latestTotal: number;
  rolling5Input: number;
  rolling5Output: number;
  rolling5Total: number;
  cumulativeInput: number;
  cumulativeOutput: number;
  cumulativeTotal: number;
  latest: { input: number; output: number; total: number };
  rolling5: { input: number; output: number; total: number };
  cumulative: { input: number; output: number; total: number };
};

export type ConversationUsageOptions = {
  mergeIntoLast?: boolean;
  promptMetrics?: ChatPromptMetrics | null;
  usageDetails?: Record<string, unknown> | null;
  followupMetrics?: {
    promptChars: number;
    rawReplyChars: number;
  } | null;
  followupUsageDetails?: Record<string, unknown> | null;
  followupDebug?: {
    prompt: string;
    rawReply: string;
    parsed: unknown;
    usageDetails?: Record<string, unknown> | null;
  } | null;
};

export type BucketUsageOptions = {
  countRun?: boolean;
};

export function incrementBucketRunCount(
  previous: number,
  options?: BucketUsageOptions
) {
  return options?.countRun === false ? previous : previous + 1;
}

export const emptyUsage = (): TokenUsage => ({
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
});

export const addUsage = (a: TokenUsage, b: TokenUsage): TokenUsage => ({
  inputTokens: a.inputTokens + b.inputTokens,
  outputTokens: a.outputTokens + b.outputTokens,
  totalTokens: a.totalTokens + b.totalTokens,
});

export const isZeroUsage = (usage: TokenUsage): boolean =>
  usage.inputTokens === 0 &&
  usage.outputTokens === 0 &&
  usage.totalTokens === 0;

export const sumUsageList = (usages: TokenUsage[]): TokenUsage =>
  usages.reduce((acc, usage) => addUsage(acc, usage), emptyUsage());

export const emptyTokenStats = (): TokenStats => ({
  lastChatUsage: null,
  lastChatUsageDetails: null,
  lastChatPromptMetrics: null,
  lastChatFollowupMetrics: null,
  lastChatFollowupUsageDetails: null,
  lastChatFollowupDebug: null,
  recentChatUsages: [],
  threadChatTotal: emptyUsage(),
  lastCompressionUsage: null,
  threadCompressionTotal: emptyUsage(),
  compressionRunCount: 0,
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

export const computeTotalTrackedUsage = (tokenStats: TokenStats): TokenUsage =>
  addUsage(
    addUsage(tokenStats.threadChatTotal, tokenStats.threadCompressionTotal),
    addUsage(
      tokenStats.threadSearchTotal,
      addUsage(tokenStats.threadTaskTotal, tokenStats.threadIngestTotal)
    )
  );

export function applyConversationUsage(args: {
  tokenStats: TokenStats;
  usage: TokenUsage;
  mergeIntoLast: boolean;
}): Pick<TokenStats, "lastChatUsage" | "recentChatUsages"> {
  const recentChatUsages =
    args.mergeIntoLast && args.tokenStats.recentChatUsages.length > 0
      ? [
          ...args.tokenStats.recentChatUsages.slice(0, -1),
          addUsage(
            args.tokenStats.recentChatUsages[
              args.tokenStats.recentChatUsages.length - 1
            ],
            args.usage
          ),
        ]
      : [...args.tokenStats.recentChatUsages, args.usage].slice(-5);

  return {
    lastChatUsage:
      args.mergeIntoLast && args.tokenStats.lastChatUsage
        ? addUsage(args.tokenStats.lastChatUsage, args.usage)
        : args.usage,
    recentChatUsages,
  };
}

export function resolveLatestPromptMetrics(args: {
  tokenStats: TokenStats;
  promptMetrics?: ChatPromptMetrics | null;
}) {
  if (args.promptMetrics) {
    return normalizeChatPromptMetrics(args.promptMetrics);
  }

  return args.tokenStats.lastChatPromptMetrics ?? null;
}

export function buildDisplayTokenStats(tokenStats: TokenStats): DisplayTokenStats {
  const rolling5Usage = sumUsageList(tokenStats.recentChatUsages);
  const totalTrackedUsage = computeTotalTrackedUsage(tokenStats);
  const latestUsage = tokenStats.lastChatUsage ?? emptyUsage();

  return {
    ...tokenStats,
    lastChatPromptMetrics: tokenStats.lastChatPromptMetrics,
    lastChatFollowupMetrics: tokenStats.lastChatFollowupMetrics,
    lastChatFollowupUsageDetails: tokenStats.lastChatFollowupUsageDetails,
    lastChatFollowupDebug: tokenStats.lastChatFollowupDebug,
    lastCompressionUsage: tokenStats.lastCompressionUsage,
    threadCompressionTotal: tokenStats.threadCompressionTotal,
    compressionRunCount: tokenStats.compressionRunCount,
    latestInput: latestUsage.inputTokens,
    latestOutput: latestUsage.outputTokens,
    latestTotal: latestUsage.totalTokens,
    rolling5Input: rolling5Usage.inputTokens,
    rolling5Output: rolling5Usage.outputTokens,
    rolling5Total: rolling5Usage.totalTokens,
    cumulativeInput: totalTrackedUsage.inputTokens,
    cumulativeOutput: totalTrackedUsage.outputTokens,
    cumulativeTotal: totalTrackedUsage.totalTokens,
    latest: {
      input: latestUsage.inputTokens,
      output: latestUsage.outputTokens,
      total: latestUsage.totalTokens,
    },
    rolling5: {
      input: rolling5Usage.inputTokens,
      output: rolling5Usage.outputTokens,
      total: rolling5Usage.totalTokens,
    },
    cumulative: {
      input: totalTrackedUsage.inputTokens,
      output: totalTrackedUsage.outputTokens,
      total: totalTrackedUsage.totalTokens,
    },
  };
}

