"use client";

import { useCallback, useMemo, useState } from "react";
import {
  applyConversationUsage,
  buildDisplayTokenStats,
  type BucketUsageOptions,
  type ConversationUsageOptions,
  type TokenStats,
  addUsage,
  emptyTokenStats,
  emptyUsage,
  incrementBucketRunCount,
  isZeroUsage,
  normalizeUsage,
  resolveLatestPromptMetrics,
} from "@/lib/shared/tokenStats";

export function useTokenTracking() {
  const [tokenStats, setTokenStats] = useState<TokenStats>(emptyTokenStats());

  const applyChatUsage = useCallback(
    (
      usage: Parameters<typeof normalizeUsage>[0],
      options?: ConversationUsageOptions
    ) => {
      if (!usage && !options?.promptMetrics) {
        return;
      }

      setTokenStats((prev) => ({
        ...prev,
        lastChatUsageDetails:
          options?.usageDetails && typeof options.usageDetails === "object"
            ? options.usageDetails
            : prev.lastChatUsageDetails,
        lastChatFollowupMetrics:
          options?.followupMetrics &&
          typeof options.followupMetrics.promptChars === "number" &&
          typeof options.followupMetrics.rawReplyChars === "number"
            ? options.followupMetrics
            : prev.lastChatFollowupMetrics,
        lastChatFollowupUsageDetails:
          options?.followupUsageDetails &&
          typeof options.followupUsageDetails === "object"
            ? options.followupUsageDetails
            : prev.lastChatFollowupUsageDetails,
        lastChatFollowupDebug:
          options?.followupDebug &&
          typeof options.followupDebug.prompt === "string" &&
          typeof options.followupDebug.rawReply === "string"
            ? options.followupDebug
            : prev.lastChatFollowupDebug,
        lastChatPromptMetrics: resolveLatestPromptMetrics({
          tokenStats: prev,
          promptMetrics: options?.promptMetrics,
        }),
        ...(() => {
          if (!usage) {
            return {};
          }

          const safeUsage = normalizeUsage(usage);
          if (isZeroUsage(safeUsage)) {
            return {};
          }

          return {
            ...applyConversationUsage({
              tokenStats: prev,
              usage: safeUsage,
              mergeIntoLast: options?.mergeIntoLast === true,
            }),
            threadChatTotal: addUsage(prev.threadChatTotal, safeUsage),
          };
        })(),
      }));
    },
    []
  );

  const applyCompressionUsage = useCallback((usage: Parameters<typeof normalizeUsage>[0]) => {
    if (!usage) return;

    const safeUsage = normalizeUsage(usage);
    if (isZeroUsage(safeUsage)) {
      return;
    }

    setTokenStats((prev) => ({
      ...prev,
      lastCompressionUsage: safeUsage,
      threadCompressionTotal: addUsage(prev.threadCompressionTotal, safeUsage),
      compressionRunCount: prev.compressionRunCount + 1,
    }));
  }, []);

  const applySearchUsage = useCallback((usage: Parameters<typeof normalizeUsage>[0]) => {
    if (!usage) return;
    const safeUsage = normalizeUsage(usage);
    if (isZeroUsage(safeUsage)) {
      return;
    }

    setTokenStats((prev) => ({
      ...prev,
      lastSearchUsage: safeUsage,
      threadSearchTotal: addUsage(prev.threadSearchTotal, safeUsage),
      searchRunCount: prev.searchRunCount + 1,
    }));
  }, []);

  const applyTaskUsage = useCallback((
    usage: Parameters<typeof normalizeUsage>[0],
    options?: BucketUsageOptions
  ) => {
    if (!usage) return;
    const safeUsage = normalizeUsage(usage);
    if (isZeroUsage(safeUsage)) {
      return;
    }

    setTokenStats((prev) => ({
      ...prev,
      lastTaskUsage: safeUsage,
      threadTaskTotal: addUsage(prev.threadTaskTotal, safeUsage),
      taskRunCount: incrementBucketRunCount(prev.taskRunCount, options),
    }));
  }, []);

  const applyIngestUsage = useCallback((usage: Parameters<typeof normalizeUsage>[0]) => {
    if (!usage) return;
    const safeUsage = normalizeUsage(usage);
    if (isZeroUsage(safeUsage)) {
      return;
    }

    setTokenStats((prev) => ({
      ...prev,
      lastIngestUsage: safeUsage,
      threadIngestTotal: addUsage(prev.threadIngestTotal, safeUsage),
      ingestRunCount: prev.ingestRunCount + 1,
    }));
  }, []);

  const resetTokenStats = useCallback(() => {
    setTokenStats(emptyTokenStats());
  }, []);

  const displayTokenStats = useMemo(
    () => buildDisplayTokenStats(tokenStats),
    [tokenStats]
  );

  return {
    tokenStats: displayTokenStats,
    applyChatUsage,
    applyCompressionUsage,
    applySearchUsage,
    applyTaskUsage,
    applyIngestUsage,
    resetTokenStats,
    totalTrackedUsage: displayTokenStats.cumulative,
  };
}

export const ZERO_USAGE = emptyUsage();

