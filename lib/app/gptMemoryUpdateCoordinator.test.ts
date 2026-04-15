import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_MEMORY_SETTINGS } from "@/lib/memory";
import {
  runGptMemoryApprovedCandidateReapplyCycle,
  runGptMemoryApprovedRulesReapplyCycle,
  runGptMemoryRejectedCandidateReapplyCycle,
  runGptMemoryUpdateCycle,
} from "@/lib/app/gptMemoryUpdateCoordinator";

const prepareCandidateMemoryUpdateMock = vi.fn();
const resolveMemorySummaryStateMock = vi.fn();

vi.mock("@/lib/app/gptMemoryCandidatePreparation", () => ({
  prepareCandidateMemoryUpdate: (...args: unknown[]) =>
    prepareCandidateMemoryUpdateMock(...args),
}));

vi.mock("@/lib/app/gptMemorySummaryResolution", () => ({
  resolveMemorySummaryState: (...args: unknown[]) =>
    resolveMemorySummaryStateMock(...args),
}));

describe("gptMemoryUpdateCoordinator", () => {
  beforeEach(() => {
    prepareCandidateMemoryUpdateMock.mockReset();
    resolveMemorySummaryStateMock.mockReset();
  });

  it("returns candidate state directly when summary is not needed", async () => {
    const onAddPendingMemoryRuleCandidates = vi.fn();

    prepareCandidateMemoryUpdateMock.mockResolvedValue({
      trimmedRecent: [{ id: "m1", role: "user", text: "hello" }],
      candidateMemory: {
        facts: [],
        preferences: [],
        lists: {},
        context: {},
      },
      needsSummary: false,
      filteredPendingCandidates: [
        {
          id: "cand-1",
          kind: "topic_alias",
          phrase: "Topic",
          normalizedValue: "Topic",
          createdAt: "2026-04-15T00:00:00.000Z",
          sourceText: "hello",
        },
      ],
    });

    const result = await runGptMemoryUpdateCycle({
      currentState: {
        memory: { facts: [], preferences: [], lists: {}, context: {} },
        recentMessages: [],
      },
      updatedRecent: [{ id: "m1", role: "user", text: "hello" }],
      settings: DEFAULT_MEMORY_SETTINGS,
      memoryInterpreterSettings: {
        llmFallbackEnabled: true,
        saveRuleCandidates: true,
      },
      approvedMemoryRules: [],
      rejectedMemoryRuleCandidateSignatures: [],
      onAddPendingMemoryRuleCandidates,
    });

    expect(onAddPendingMemoryRuleCandidates).toHaveBeenCalledWith(
      [expect.objectContaining({ id: "cand-1" })],
      []
    );
    expect(resolveMemorySummaryStateMock).not.toHaveBeenCalled();
    expect(result.summaryUsage).toBeNull();
    expect(result.nextState.recentMessages).toEqual([
      { id: "m1", role: "user", text: "hello" },
    ]);
  });

  it("delegates to summary resolution when needed", async () => {
    prepareCandidateMemoryUpdateMock.mockResolvedValue({
      trimmedRecent: [{ id: "m1", role: "user", text: "hello" }],
      candidateMemory: {
        facts: ["candidate fact"],
        preferences: [],
        lists: {},
        context: {},
      },
      needsSummary: true,
      filteredPendingCandidates: [],
    });
    resolveMemorySummaryStateMock.mockResolvedValue({
      nextState: {
        memory: {
          facts: ["candidate fact", "summary fact"],
          preferences: [],
          lists: {},
          context: {},
        },
        recentMessages: [{ id: "m1", role: "user", text: "hello" }],
      },
      summaryUsage: {
        inputTokens: 10,
        outputTokens: 3,
        totalTokens: 13,
      },
    });

    const result = await runGptMemoryUpdateCycle({
      currentState: {
        memory: { facts: [], preferences: [], lists: {}, context: {} },
        recentMessages: [],
      },
      updatedRecent: [{ id: "m1", role: "user", text: "hello" }],
      settings: DEFAULT_MEMORY_SETTINGS,
      memoryInterpreterSettings: {
        llmFallbackEnabled: true,
        saveRuleCandidates: true,
      },
      approvedMemoryRules: [],
      rejectedMemoryRuleCandidateSignatures: [],
      onAddPendingMemoryRuleCandidates: vi.fn(),
    });

    expect(resolveMemorySummaryStateMock).toHaveBeenCalledWith({
      candidateMemory: {
        facts: ["candidate fact"],
        preferences: [],
        lists: {},
        context: {},
      },
      trimmedRecent: [{ id: "m1", role: "user", text: "hello" }],
      settings: DEFAULT_MEMORY_SETTINGS,
    });
    expect(result.summaryUsage).toEqual({
      inputTokens: 10,
      outputTokens: 3,
      totalTokens: 13,
    });
  });

  it("returns null reapply state when there are no reapplicable messages", async () => {
    const result = await runGptMemoryApprovedRulesReapplyCycle({
      currentState: {
        memory: { facts: [], preferences: [], lists: {}, context: {} },
        recentMessages: [],
      },
      settings: DEFAULT_MEMORY_SETTINGS,
      memoryInterpreterSettings: {
        llmFallbackEnabled: true,
        saveRuleCandidates: true,
      },
      approvedMemoryRules: [],
      rejectedMemoryRuleCandidateSignatures: [],
      approvedMemoryRulesOverride: [],
      onAddPendingMemoryRuleCandidates: vi.fn(),
    });

    expect(result).toEqual({
      nextState: null,
      summaryUsage: null,
    });
  });

  it("builds approved-candidate reapply through the shared update cycle", async () => {
    prepareCandidateMemoryUpdateMock.mockResolvedValue({
      trimmedRecent: [{ id: "u1", role: "user", text: "hello" }],
      candidateMemory: {
        facts: [],
        preferences: [],
        lists: {},
        context: {},
      },
      needsSummary: false,
      filteredPendingCandidates: [],
    });

    const result = await runGptMemoryApprovedCandidateReapplyCycle({
      currentState: {
        memory: { facts: [], preferences: [], lists: {}, context: {} },
        recentMessages: [{ id: "u1", role: "user", text: "hello" }],
      },
      settings: DEFAULT_MEMORY_SETTINGS,
      memoryInterpreterSettings: {
        llmFallbackEnabled: true,
        saveRuleCandidates: true,
      },
      approvedMemoryRules: [],
      rejectedMemoryRuleCandidateSignatures: [],
      candidate: {
        id: "cand-1",
        kind: "topic_alias",
        phrase: "Move planning",
        normalizedValue: "Move Planning",
        createdAt: "2026-04-15T00:00:00.000Z",
        sourceText: "hello",
      },
      approvedMemoryRulesOverride: [],
      onAddPendingMemoryRuleCandidates: vi.fn(),
    });

    expect(prepareCandidateMemoryUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          topicAdjudication: expect.objectContaining({
            committedTopic: "Move Planning",
          }),
        }),
        approvedRules: [
          expect.objectContaining({
            id: "cand-1",
            phrase: "Move planning",
          }),
        ],
      })
    );
    expect(result.nextState?.recentMessages).toEqual([
      { id: "u1", role: "user", text: "hello" },
    ]);
  });

  it("builds rejected-candidate reapply through the shared update cycle", async () => {
    prepareCandidateMemoryUpdateMock.mockResolvedValue({
      trimmedRecent: [{ id: "u1", role: "user", text: "hello" }],
      candidateMemory: {
        facts: [],
        preferences: [],
        lists: {},
        context: {},
      },
      needsSummary: false,
      filteredPendingCandidates: [],
    });

    await runGptMemoryRejectedCandidateReapplyCycle({
      currentState: {
        memory: {
          facts: [],
          preferences: [],
          lists: { trackedEntities: ["Wrong Topic"] },
          context: { currentTopic: "Wrong Topic" },
        },
        recentMessages: [{ id: "u1", role: "user", text: "hello" }],
      },
      settings: DEFAULT_MEMORY_SETTINGS,
      memoryInterpreterSettings: {
        llmFallbackEnabled: true,
        saveRuleCandidates: true,
      },
      approvedMemoryRules: [],
      rejectedMemoryRuleCandidateSignatures: [],
      candidate: {
        id: "cand-2",
        kind: "topic_alias",
        phrase: "Wrong Topic",
        normalizedValue: "Wrong Topic",
        createdAt: "2026-04-15T00:00:00.000Z",
        sourceText: "hello",
      },
      rejectedMemoryRuleCandidateSignaturesOverride: ["topic_alias|Wrong Topic"],
      onAddPendingMemoryRuleCandidates: vi.fn(),
    });

    expect(prepareCandidateMemoryUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        currentMemory: expect.objectContaining({
          context: expect.objectContaining({
            currentTopic: undefined,
          }),
        }),
        rejectedMemoryRuleCandidateSignatures: ["topic_alias|Wrong Topic"],
      })
    );
  });
});
