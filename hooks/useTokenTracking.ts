"use client";

import { useCallback, useMemo, useState } from "react";
import {
  type TokenStats,
  emptyTokenStats,
  emptyUsage,
  normalizeUsage,
} from "@/lib/tokenStats";

export function useTokenTracking() {
  const [tokenStats, setTokenStats] = useState<TokenStats>(emptyTokenStats());

  const applyChatUsage = useCallback((usage: Parameters<typeof normalizeUsage>[0]) => {
    const safeUsage = normalizeUsage(usage);

    setTokenStats((prev) => {
      const recentChatUsages = [...prev.recentChatUsages, safeUsage].slice(-5);

      return {
        ...prev,
        lastChatUsage: safeUsage,
        recentChatUsages,
        threadChatTotal: {
          inputTokens: prev.threadChatTotal.inputTokens + safeUsage.inputTokens,
          outputTokens: prev.threadChatTotal.outputTokens + safeUsage.outputTokens,
          totalTokens: prev.threadChatTotal.totalTokens + safeUsage.totalTokens,
        },
      };
    });
  }, []);

  const applySummaryUsage = useCallback((usage: Parameters<typeof normalizeUsage>[0]) => {
    if (!usage) return;

    const safeUsage = normalizeUsage(usage);
    if (
      safeUsage.inputTokens === 0 &&
      safeUsage.outputTokens === 0 &&
      safeUsage.totalTokens === 0
    ) {
      return;
    }

    setTokenStats((prev) => ({
      ...prev,
      lastSummaryUsage: safeUsage,
      threadSummaryTotal: {
        inputTokens: prev.threadSummaryTotal.inputTokens + safeUsage.inputTokens,
        outputTokens: prev.threadSummaryTotal.outputTokens + safeUsage.outputTokens,
        totalTokens: prev.threadSummaryTotal.totalTokens + safeUsage.totalTokens,
      },
      summaryRunCount: prev.summaryRunCount + 1,
    }));
  }, []);

  const applySearchUsage = useCallback((usage: Parameters<typeof normalizeUsage>[0]) => {
    const safeUsage = normalizeUsage(usage);

    setTokenStats((prev) => ({
      ...prev,
      lastSearchUsage: safeUsage,
      threadSearchTotal: {
        inputTokens: prev.threadSearchTotal.inputTokens + safeUsage.inputTokens,
        outputTokens: prev.threadSearchTotal.outputTokens + safeUsage.outputTokens,
        totalTokens: prev.threadSearchTotal.totalTokens + safeUsage.totalTokens,
      },
      searchRunCount: prev.searchRunCount + 1,
    }));
  }, []);

  const applyTaskUsage = useCallback((usage: Parameters<typeof normalizeUsage>[0]) => {
    const safeUsage = normalizeUsage(usage);

    setTokenStats((prev) => ({
      ...prev,
      lastTaskUsage: safeUsage,
      threadTaskTotal: {
        inputTokens: prev.threadTaskTotal.inputTokens + safeUsage.inputTokens,
        outputTokens: prev.threadTaskTotal.outputTokens + safeUsage.outputTokens,
        totalTokens: prev.threadTaskTotal.totalTokens + safeUsage.totalTokens,
      },
      taskRunCount: prev.taskRunCount + 1,
    }));
  }, []);

  const applyIngestUsage = useCallback((usage: Parameters<typeof normalizeUsage>[0]) => {
    const safeUsage = normalizeUsage(usage);

    setTokenStats((prev) => ({
      ...prev,
      lastIngestUsage: safeUsage,
      threadIngestTotal: {
        inputTokens: prev.threadIngestTotal.inputTokens + safeUsage.inputTokens,
        outputTokens: prev.threadIngestTotal.outputTokens + safeUsage.outputTokens,
        totalTokens: prev.threadIngestTotal.totalTokens + safeUsage.totalTokens,
      },
      ingestRunCount: prev.ingestRunCount + 1,
    }));
  }, []);

  const resetTokenStats = useCallback(() => {
    setTokenStats(emptyTokenStats());
  }, []);

  const totalTrackedUsage = useMemo(() => ({
    inputTokens:
      tokenStats.threadChatTotal.inputTokens +
      tokenStats.threadSummaryTotal.inputTokens +
      tokenStats.threadSearchTotal.inputTokens +
      tokenStats.threadTaskTotal.inputTokens +
      tokenStats.threadIngestTotal.inputTokens,
    outputTokens:
      tokenStats.threadChatTotal.outputTokens +
      tokenStats.threadSummaryTotal.outputTokens +
      tokenStats.threadSearchTotal.outputTokens +
      tokenStats.threadTaskTotal.outputTokens +
      tokenStats.threadIngestTotal.outputTokens,
    totalTokens:
      tokenStats.threadChatTotal.totalTokens +
      tokenStats.threadSummaryTotal.totalTokens +
      tokenStats.threadSearchTotal.totalTokens +
      tokenStats.threadTaskTotal.totalTokens +
      tokenStats.threadIngestTotal.totalTokens,
  }), [tokenStats]);

  return {
    tokenStats,
    applyChatUsage,
    applySummaryUsage,
    applySearchUsage,
    applyTaskUsage,
    applyIngestUsage,
    resetTokenStats,
    totalTrackedUsage,
  };
}

export const ZERO_USAGE = emptyUsage();
