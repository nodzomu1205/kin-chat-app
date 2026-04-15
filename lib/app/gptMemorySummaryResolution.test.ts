import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_MEMORY_SETTINGS } from "@/lib/memory";
import { resolveMemorySummaryState } from "@/lib/app/gptMemorySummaryResolution";

describe("gptMemorySummaryResolution", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns summarized state and normalized usage on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          memory: {
            facts: ["summary fact"],
            preferences: [],
            lists: {},
            context: {
              currentTopic: "Topic A",
            },
          },
          usage: {
            inputTokens: 10,
            outputTokens: 4,
          },
        }),
      })
    );

    const result = await resolveMemorySummaryState({
      candidateMemory: {
        facts: ["candidate fact"],
        preferences: [],
        lists: {},
        context: {
          currentTopic: "Topic A",
        },
      },
      trimmedRecent: [{ id: "m1", role: "user", text: "Topic A" }],
      settings: DEFAULT_MEMORY_SETTINGS,
    });

    expect(result.nextState.memory.facts).toEqual(["candidate fact", "summary fact"]);
    expect(result.summaryUsage).toEqual({
      inputTokens: 10,
      outputTokens: 4,
      totalTokens: 14,
    });
  });

  it("falls back to candidate state when summarize fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      })
    );

    const result = await resolveMemorySummaryState({
      candidateMemory: {
        facts: ["candidate fact"],
        preferences: [],
        lists: {},
        context: {},
      },
      trimmedRecent: [{ id: "m1", role: "user", text: "hello" }],
      settings: DEFAULT_MEMORY_SETTINGS,
    });

    expect(result.nextState.memory.facts).toEqual(["candidate fact"]);
    expect(result.nextState.recentMessages).toEqual([
      { id: "m1", role: "user", text: "hello" },
    ]);
    expect(result.summaryUsage).toBeNull();
  });
});
