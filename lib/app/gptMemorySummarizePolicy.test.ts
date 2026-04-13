import { describe, expect, it } from "vitest";
import { shouldSummarizeMemoryUpdate } from "@/lib/app/gptMemorySummarizePolicy";
import { DEFAULT_MEMORY_SETTINGS } from "@/lib/memory";
import type { Message } from "@/types/chat";

function buildMessage(id: string, role: Message["role"], text: string): Message {
  return { id, role, text };
}

describe("gptMemorySummarizePolicy", () => {
  it("requests summarize when recent messages reach the full chat limit", () => {
    const trimmedRecent = Array.from({ length: 10 }, (_, index) =>
      buildMessage(`m${index}`, index % 2 === 0 ? "user" : "gpt", `msg-${index}`)
    );

    expect(
      shouldSummarizeMemoryUpdate({
        trimmedRecent,
        candidateMemory: {
          facts: [],
          preferences: [],
          lists: {},
          context: {},
        },
        settings: DEFAULT_MEMORY_SETTINGS,
      })
    ).toBe(true);
  });

  it("requests summarize when token pressure exceeds capacity after threshold", () => {
    const trimmedRecent = Array.from({ length: 8 }, (_, index) =>
      buildMessage(`m${index}`, index % 2 === 0 ? "user" : "gpt", `msg-${index}`)
    );

    expect(
      shouldSummarizeMemoryUpdate({
        trimmedRecent,
        candidateMemory: {
          facts: Array.from({ length: 13 }, (_, index) => `fact-${index}`),
          preferences: Array.from({ length: 10 }, (_, index) => `pref-${index}`),
          lists: {},
          context: {},
        },
        settings: DEFAULT_MEMORY_SETTINGS,
      })
    ).toBe(true);
  });

  it("does not summarize before the threshold when memory pressure is still low", () => {
    const trimmedRecent = Array.from({ length: 4 }, (_, index) =>
      buildMessage(`m${index}`, index % 2 === 0 ? "user" : "gpt", `msg-${index}`)
    );

    expect(
      shouldSummarizeMemoryUpdate({
        trimmedRecent,
        candidateMemory: {
          facts: ["fact-1"],
          preferences: ["pref-1"],
          lists: {},
          context: {},
        },
        settings: DEFAULT_MEMORY_SETTINGS,
      })
    ).toBe(false);
  });
});
