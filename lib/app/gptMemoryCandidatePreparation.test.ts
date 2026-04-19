import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_MEMORY_SETTINGS } from "@/lib/memory";
import { prepareCandidateMemoryUpdate } from "@/lib/app/gptMemoryCandidatePreparation";

const resolveMemoryFallbackOptionsMock = vi.fn();
const buildCandidateMemoryStateMock = vi.fn();
const shouldSummarizeMemoryUpdateMock = vi.fn();

vi.mock("@/lib/app/memoryInterpreter", () => ({
  resolveMemoryFallbackOptions: (...args: unknown[]) =>
    resolveMemoryFallbackOptionsMock(...args),
}));

vi.mock("@/lib/app/gptMemoryStateCandidate", () => ({
  buildCandidateMemoryState: (...args: unknown[]) => buildCandidateMemoryStateMock(...args),
}));

vi.mock("@/lib/app/gptMemorySummarizePolicy", () => ({
  shouldSummarizeMemoryUpdate: (...args: unknown[]) =>
    shouldSummarizeMemoryUpdateMock(...args),
}));

describe("gptMemoryCandidatePreparation", () => {
  beforeEach(() => {
    resolveMemoryFallbackOptionsMock.mockReset();
    buildCandidateMemoryStateMock.mockReset();
    shouldSummarizeMemoryUpdateMock.mockReset();
  });

  it("prepares a memory update with filtered pending candidates", async () => {
    resolveMemoryFallbackOptionsMock.mockResolvedValue({
      adjudication: { committedTopic: "New Topic" },
      pendingCandidates: [
        {
          id: "cand-1",
          kind: "utterance_review",
          phrase: "Move planning",
          normalizedValue: "Move Planning",
          topicDecision: "switch",
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

    const result = await prepareCandidateMemoryUpdate({
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
      rejectedMemoryRuleCandidateSignatures: ["utterance_review|switch|Move Planning"],
    });

    expect(result.needsSummary).toBe(false);
    expect(result.filteredPendingCandidates).toEqual([]);
    expect(buildCandidateMemoryStateMock).toHaveBeenCalled();
    expect(buildCandidateMemoryStateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          topicAdjudication: expect.objectContaining({
            committedTopic: "New Topic",
          }),
        }),
      })
    );
  });

  it("passes through preserveExistingTopic when fallback chooses a safe keep", async () => {
    resolveMemoryFallbackOptionsMock.mockResolvedValue({
      adjudication: { preserveExistingTopic: true, proposedTopic: undefined },
      pendingCandidates: [],
      usedFallback: true,
    });
    buildCandidateMemoryStateMock.mockReturnValue({
      trimmedRecent: [{ id: "m1", role: "user", text: "なかなかユニークな発想ですね。" }],
      candidateMemory: {
        facts: [],
        preferences: [],
        lists: {},
        context: {
          currentTopic: "プラトン",
        },
      },
    });
    shouldSummarizeMemoryUpdateMock.mockReturnValue(false);

    await prepareCandidateMemoryUpdate({
      currentMemory: {
        facts: [],
        preferences: [],
        lists: {},
        context: {
          currentTopic: "プラトン",
        },
      },
      updatedRecent: [
        { id: "m0", role: "gpt", text: "プラトンの思想を説明します。" },
        { id: "m1", role: "user", text: "なかなかユニークな発想ですね。" },
      ],
      settings: DEFAULT_MEMORY_SETTINGS,
      memoryInterpreterSettings: {
        llmFallbackEnabled: true,
        saveRuleCandidates: true,
      },
      approvedRules: [],
      rejectedMemoryRuleCandidateSignatures: [],
    });

    expect(buildCandidateMemoryStateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          topicAdjudication: expect.objectContaining({
            preserveExistingTopic: true,
          }),
        }),
      })
    );
  });

  it("does not persist fallback debug payload into candidate memory", async () => {
    resolveMemoryFallbackOptionsMock.mockResolvedValue({
      adjudication: {},
      pendingCandidates: [],
      usedFallback: true,
      debug: {
        prompt: "debug prompt",
        rawReply: "debug raw",
        parsed: { currentTopic: "Debug Topic" },
      },
    });
    const candidateMemory = {
      facts: [],
      preferences: [],
      lists: {},
      context: {},
    };
    buildCandidateMemoryStateMock.mockReturnValue({
      trimmedRecent: [{ id: "m1", role: "user", text: "hello" }],
      candidateMemory,
    });
    shouldSummarizeMemoryUpdateMock.mockReturnValue(false);

    const result = await prepareCandidateMemoryUpdate({
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
      rejectedMemoryRuleCandidateSignatures: [],
    });

    expect(result.candidateMemory.lists).toEqual({});
    expect(result.candidateMemory.lists).not.toHaveProperty(
      "memoryInterpretDebug"
    );
  });
});
