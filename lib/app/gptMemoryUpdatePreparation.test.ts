import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_MEMORY_SETTINGS } from "@/lib/memory";
import { prepareMemoryUpdate } from "@/lib/app/gptMemoryUpdatePreparation";

const resolveMemoryFallbackOptionsMock = vi.fn();
const buildCandidateMemoryStateMock = vi.fn();
const shouldSummarizeMemoryUpdateMock = vi.fn();

vi.mock("@/lib/app/memoryInterpreter", () => ({
  resolveMemoryFallbackOptions: (...args: unknown[]) =>
    resolveMemoryFallbackOptionsMock(...args),
}));

vi.mock("@/lib/app/gptMemoryStateHelpers", () => ({
  buildCandidateMemoryState: (...args: unknown[]) => buildCandidateMemoryStateMock(...args),
}));

vi.mock("@/lib/app/gptMemorySummarizePolicy", () => ({
  shouldSummarizeMemoryUpdate: (...args: unknown[]) =>
    shouldSummarizeMemoryUpdateMock(...args),
}));

describe("gptMemoryUpdatePreparation", () => {
  beforeEach(() => {
    resolveMemoryFallbackOptionsMock.mockReset();
    buildCandidateMemoryStateMock.mockReset();
    shouldSummarizeMemoryUpdateMock.mockReset();
  });

  it("prepares a memory update with filtered pending candidates", async () => {
    resolveMemoryFallbackOptionsMock.mockResolvedValue({
      optionsPatch: { topicSeed: "New Topic" },
      pendingCandidates: [
        {
          id: "cand-1",
          kind: "topic_alias",
          phrase: "Move planning",
          normalizedValue: "Move Planning",
          createdAt: "2026-04-13T00:00:00.000Z",
          sourceText: "We need to move soon.",
        },
      ],
      usedFallback: true,
    });
    buildCandidateMemoryStateMock.mockReturnValue({
      trimmedRecent: [{ id: "m1", role: "user", text: "hello" }],
      candidateMemory: {
        facts: [],
        preferences: [],
        lists: {},
        context: {},
      },
    });
    shouldSummarizeMemoryUpdateMock.mockReturnValue(false);

    const result = await prepareMemoryUpdate({
      currentMemory: {
        facts: [],
        preferences: [],
        lists: {},
        context: {},
      },
      updatedRecent: [{ id: "m1", role: "user", text: "hello" }],
      settings: DEFAULT_MEMORY_SETTINGS,
      memoryInterpreterSettings: {
        llmFallbackEnabled: true,
        saveRuleCandidates: true,
      },
      approvedRules: [],
      rejectedMemoryRuleCandidateSignatures: ["topic_alias|Move Planning"],
    });

    expect(result.needsSummary).toBe(false);
    expect(result.filteredPendingCandidates).toEqual([]);
    expect(buildCandidateMemoryStateMock).toHaveBeenCalled();
  });
});
