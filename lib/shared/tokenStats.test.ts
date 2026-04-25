import { describe, expect, it } from "vitest";
import {
  applyConversationUsage,
  buildDisplayTokenStats,
  emptyTokenStats,
  incrementBucketRunCount,
  resolveLatestPromptMetrics,
} from "@/lib/shared/tokenStats";

describe("tokenStats helpers", () => {
  it("merges compaction usage into the latest conversation event", () => {
    const tokenStats = {
      ...emptyTokenStats(),
      lastChatUsage: {
        inputTokens: 100,
        outputTokens: 40,
        totalTokens: 140,
      },
      recentChatUsages: [
        {
          inputTokens: 100,
          outputTokens: 40,
          totalTokens: 140,
        },
      ],
    };

    expect(
      applyConversationUsage({
        tokenStats,
        usage: {
          inputTokens: 12,
          outputTokens: 3,
          totalTokens: 15,
        },
        mergeIntoLast: true,
      })
    ).toEqual({
      lastChatUsage: {
        inputTokens: 112,
        outputTokens: 43,
        totalTokens: 155,
      },
      recentChatUsages: [
        {
          inputTokens: 112,
          outputTokens: 43,
          totalTokens: 155,
        },
      ],
    });
  });

  it("appends a standalone conversation event when there is no chat usage to merge", () => {
    const tokenStats = {
      ...emptyTokenStats(),
      recentChatUsages: [
        {
          inputTokens: 40,
          outputTokens: 10,
          totalTokens: 50,
        },
      ],
    };

    expect(
      applyConversationUsage({
        tokenStats,
        usage: {
          inputTokens: 8,
          outputTokens: 2,
          totalTokens: 10,
        },
        mergeIntoLast: false,
      })
    ).toEqual({
      lastChatUsage: {
        inputTokens: 8,
        outputTokens: 2,
        totalTokens: 10,
      },
      recentChatUsages: [
        {
          inputTokens: 40,
          outputTokens: 10,
          totalTokens: 50,
        },
        {
          inputTokens: 8,
          outputTokens: 2,
          totalTokens: 10,
        },
      ],
    });
  });

  it("builds display totals from all tracked token buckets", () => {
    const tokenStats = {
      ...emptyTokenStats(),
      lastChatUsage: {
        inputTokens: 11,
        outputTokens: 4,
        totalTokens: 15,
      },
      recentChatUsages: [
        {
          inputTokens: 11,
          outputTokens: 4,
          totalTokens: 15,
        },
        {
          inputTokens: 20,
          outputTokens: 5,
          totalTokens: 25,
        },
      ],
      threadChatTotal: {
        inputTokens: 100,
        outputTokens: 40,
        totalTokens: 140,
      },
      threadCompressionTotal: {
        inputTokens: 15,
        outputTokens: 5,
        totalTokens: 20,
      },
      threadSearchTotal: {
        inputTokens: 60,
        outputTokens: 10,
        totalTokens: 70,
      },
      threadTaskTotal: {
        inputTokens: 35,
        outputTokens: 15,
        totalTokens: 50,
      },
      threadIngestTotal: {
        inputTokens: 25,
        outputTokens: 5,
        totalTokens: 30,
      },
    };

    const displayTokenStats = buildDisplayTokenStats(tokenStats);

    expect(displayTokenStats.rolling5).toEqual({
      input: 31,
      output: 9,
      total: 40,
    });
    expect(displayTokenStats.cumulative).toEqual({
      input: 235,
      output: 75,
      total: 310,
    });
    expect(displayTokenStats.cumulativeInput).toBe(235);
    expect(displayTokenStats.cumulativeOutput).toBe(75);
    expect(displayTokenStats.cumulativeTotal).toBe(310);
  });

  it("normalizes and preserves the latest prompt metrics", () => {
    const tokenStats = {
      ...emptyTokenStats(),
      lastChatPromptMetrics: {
        messageCount: 5,
        systemMessageCount: 2,
        recentMessageCount: 2,
        totalChars: 120,
        systemChars: 60,
        baseSystemChars: 50,
        memoryChars: 20,
        storedLibraryChars: 10,
        storedSearchChars: 5,
        storedDocumentChars: 0,
        searchPromptChars: 0,
        recentChars: 25,
        recentUserChars: 10,
        recentAssistantChars: 15,
        rawInputChars: 3,
        wrappedInputChars: 3,
      },
    };

    expect(
      resolveLatestPromptMetrics({
        tokenStats,
        promptMetrics: null,
      })
    ).toEqual(tokenStats.lastChatPromptMetrics);
  });

  it("does not increment bucket run count for inner usage events", () => {
    expect(incrementBucketRunCount(2, { countRun: false })).toBe(2);
    expect(incrementBucketRunCount(2)).toBe(3);
  });
});
