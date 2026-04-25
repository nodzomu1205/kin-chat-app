import { afterEach, describe, expect, it, vi } from "vitest";
import {
  orchestrateMemoryFallback,
  resolveApprovedMemoryRuleAdjudication,
  shouldRunMemoryFallback,
} from "@/lib/app/memory-interpreter/memoryInterpreterFallbackOrchestrator";

const fetchMock = vi.fn();

describe("memoryInterpreterFallbackOrchestrator", () => {
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("returns an approved rule adjudication without running fallback", async () => {
    const result = await orchestrateMemoryFallback({
      latestUserText: "that does not sound right",
      recentMessages: [],
      currentMemory: {
        facts: [],
        preferences: [],
        lists: {},
        context: {},
      },
      settings: {
        llmFallbackEnabled: true,
        saveRuleCandidates: true,
      },
      approvedRules: [
        {
          id: "rule-1",
          phrase: "that does not sound right",
          kind: "utterance_review",
          normalizedValue: "Socrates",
          topicDecision: "keep",
          surfacePattern: "that does not sound right",
          evidenceText: "sound right",
          leftContext: "that does not",
          rightContext: ".",
          approvedCount: 3,
          createdAt: "2026-04-13T00:00:00.000Z",
        },
      ],
    });

    expect(result).toEqual({
      adjudication: expect.objectContaining({
        disableInputTopicInference: true,
        committedTopic: "Socrates",
        trackedEntityOverride: "Socrates",
      }),
      pendingCandidates: [],
      usedFallback: false,
      fallbackUsage: null,
    });
  });

  it("exposes the fallback gate decision", () => {
    expect(
      shouldRunMemoryFallback({
        latestUserText: "tell me more about socrates",
        currentMemory: {
          facts: [],
          preferences: [],
          lists: {},
          context: { currentTopic: "Socrates" },
        },
        settings: {
          llmFallbackEnabled: true,
          saveRuleCandidates: true,
        },
        approvedRules: [],
      })
    ).toBe(true);

    expect(
      shouldRunMemoryFallback({
        latestUserText: "search: tokyo weather",
        currentMemory: {
          facts: [],
          preferences: [],
          lists: {},
          context: {},
        },
        settings: {
          llmFallbackEnabled: true,
          saveRuleCandidates: true,
        },
        approvedRules: [],
      })
    ).toBe(false);
  });

  it("still runs fallback when an approved rule match is weak", () => {
    expect(
      shouldRunMemoryFallback({
        latestUserText: "that does not sound right",
        currentMemory: {
          facts: [],
          preferences: [],
          lists: {},
          context: { currentTopic: "Socrates" },
        },
        settings: {
          llmFallbackEnabled: true,
          saveRuleCandidates: true,
        },
        approvedRules: [
          {
            id: "weak-rule",
            phrase: "sound right",
            kind: "utterance_review",
            normalizedValue: "Socrates",
            topicDecision: "keep",
            approvedCount: 1,
            createdAt: "2026-04-13T00:00:00.000Z",
          },
        ],
      })
    ).toBe(true);
  });

  it("delegates to fallback flow when approved rules do not match", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          reply: JSON.stringify({
            decision: "keep",
            confidence: 0.9,
            intent: "question",
            proposedTopic: null,
            topic: null,
            isClosingReply: false,
            trackedEntity: null,
          }),
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await orchestrateMemoryFallback({
      latestUserText: "tell me more about socrates",
      recentMessages: [
        { id: "u1", role: "user", text: "who is socrates?" },
        { id: "g1", role: "gpt", text: "Socrates was a Greek philosopher." },
      ],
      currentMemory: {
        facts: [],
        preferences: [],
        lists: {},
        context: {
          currentTopic: "Socrates",
          lastUserIntent: "who is socrates?",
        },
      },
      settings: {
        llmFallbackEnabled: true,
        saveRuleCandidates: true,
      },
      approvedRules: [],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.usedFallback).toBe(true);
    expect(result.fallbackUsage).toBeNull();
  });

  it("does not bypass approval for an unapproved mid-conversation switch", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          reply: JSON.stringify({
            decision: "switch",
            confidence: 0.95,
            intent: "question",
            proposedTopic: "Edo period",
            topic: "Edo period",
            isClosingReply: false,
            trackedEntity: null,
          }),
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await orchestrateMemoryFallback({
      latestUserText: "Tell me about the Edo period",
      recentMessages: [
        { id: "g1", role: "gpt", text: "Japanese history has many eras.", meta: { kind: "normal" } },
        { id: "u1", role: "user", text: "Tell me about the Edo period" },
      ],
      currentMemory: {
        facts: [],
        preferences: [],
        lists: {},
        context: { currentTopic: "Japanese history" },
      },
      settings: {
        llmFallbackEnabled: true,
        saveRuleCandidates: true,
      },
      approvedRules: [],
    });

    expect(result.adjudication).toEqual({
      disableInputTopicInference: true,
      preserveExistingTopic: true,
      proposedTopic: "Edo period",
    });
    expect(result.fallbackUsage).toBeNull();
  });

  it("exposes approved rule adjudication resolution as a pure helper", () => {
    expect(
      resolveApprovedMemoryRuleAdjudication({
        latestUserText: "that does not sound right",
        approvedRules: [
          {
            id: "rule-1",
            phrase: "that does not sound right",
            kind: "utterance_review",
            normalizedValue: "Socrates",
            topicDecision: "keep",
            surfacePattern: "that does not sound right",
            evidenceText: "sound right",
            leftContext: "that does not",
            rightContext: ".",
            approvedCount: 3,
            createdAt: "2026-04-13T00:00:00.000Z",
          },
        ],
      })
    ).toEqual(
      expect.objectContaining({
        disableInputTopicInference: true,
        committedTopic: "Socrates",
        trackedEntityOverride: "Socrates",
      })
    );
  });
});
