import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_MEMORY_SETTINGS } from "@/lib/memory-domain/memory";
import { resolveMemoryCompressionState } from "@/lib/app/gpt-memory/gptMemorySummaryResolution";

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
          compactedText: "Older discussion stayed on Topic A and no unresolved blockers remained.",
          usage: {
            inputTokens: 10,
            outputTokens: 4,
          },
        }),
      })
    );

    const result = await resolveMemoryCompressionState({
      candidateMemory: {
        facts: ["candidate fact"],
        preferences: [],
        lists: {},
        context: {
          currentTopic: "Topic A",
        },
      },
      trimmedRecent: Array.from({ length: 6 }, (_, index) => ({
        id: `m${index + 1}`,
        role: index % 2 === 0 ? ("user" as const) : ("gpt" as const),
        text: `Topic A turn ${index + 1}`,
      })),
      settings: DEFAULT_MEMORY_SETTINGS,
    });

    expect(result.nextState.memory.facts).toEqual(["candidate fact"]);
    expect(result.nextState.recentMessages[0]?.text).toContain(
      "Older discussion stayed on Topic A"
    );
    expect(result.compressionUsage).toEqual({
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

    const result = await resolveMemoryCompressionState({
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
    expect(result.compressionUsage).toBeNull();
  });
});

