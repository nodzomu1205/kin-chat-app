import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildMemoryFallbackRequestInput,
  buildSafeFallbackFailureResult,
  resolveMemoryFallbackFlow,
} from "@/lib/app/memory-interpreter/memoryInterpreterFallbackFlow";

const fetchMock = vi.fn();

describe("memoryInterpreterFallbackFlow", () => {
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("builds fallback prompt input with the latest meaningful conversation context", () => {
    const prompt = buildMemoryFallbackRequestInput({
      latestUserText: "latest question",
      recentMessages: [
        {
          id: "g1",
          role: "gpt",
          text: "older gpt reply",
          meta: { kind: "normal", sourceType: "gpt_input" },
        },
        {
          id: "u0",
          role: "user",
          text: "older user question",
        },
        {
          id: "g2",
          role: "gpt",
          text: "latest gpt task reply",
          meta: { kind: "task_prep", sourceType: "gpt_input" },
        },
        { id: "u1", role: "user", text: "latest question" },
      ],
      currentMemory: {
        facts: [],
        preferences: [],
        lists: {},
        context: {
          currentTopic: "Current Topic",
          currentTask: "Current Task",
          lastUserIntent: "Last Intent",
        },
      },
    });

    expect(prompt).toContain("TOPIC: Current Topic");
    expect(prompt).toContain("TASK: Current Task");
    expect(prompt).toContain("LAST_INTENT: Last Intent");
    expect(prompt).toContain("PRIOR: latest gpt task reply");
    expect(prompt).toContain("EARLIER: older user question");
    expect(prompt).toContain("USER:");
    expect(prompt).toContain("latest question");
  });

  it("falls back to preserving the current topic when response parsing fails", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ reply: "not json" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveMemoryFallbackFlow({
      latestUserText: "hello",
      recentMessages: [],
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
    });

    expect(result).toEqual(
      expect.objectContaining(
        buildSafeFallbackFailureResult({
          facts: [],
          preferences: [],
          lists: {},
          context: { currentTopic: "Socrates" },
        })
      )
    );
    expect(result.debug).toEqual(
      expect.objectContaining({
        rawReply: "not json",
        parsed: null,
      })
    );
  });

  it("disables raw input-topic inference when fallback returns no usable topic on an initial turn", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          reply: JSON.stringify({
            decision: "unsure",
            confidence: 0.4,
            intent: "statement",
            proposedTopic: null,
            topic: null,
            isClosingReply: false,
            trackedEntity: null,
          }),
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveMemoryFallbackFlow({
      latestUserText: "first topic statement",
      recentMessages: [{ id: "u1", role: "user", text: "first topic statement" }],
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
    });

    expect(result.usedFallback).toBe(true);
    expect(result.adjudication.disableInputTopicInference).toBe(true);
    expect(result.debug).toEqual(
      expect.objectContaining({
        rawReply: expect.any(String),
        parsed: expect.objectContaining({
          decision: "unsure",
        }),
      })
    );
  });

  it("keeps the current topic and emits only a proposal during an active conversation", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          reply: JSON.stringify({
            decision: "switch",
            confidence: 0.97,
            intent: "question",
            proposedTopic: "Edo period",
            topic: "Edo period",
            isClosingReply: false,
            trackedEntity: null,
          }),
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveMemoryFallbackFlow({
      latestUserText: "tell me more about the Edo period",
      recentMessages: [
        {
          id: "g1",
          role: "gpt",
          text: "We were discussing Japanese history.",
          meta: { kind: "normal" },
        },
        { id: "u1", role: "user", text: "tell me more about the Edo period" },
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
    });

    expect(result.adjudication).toEqual({
      disableInputTopicInference: true,
      preserveExistingTopic: true,
      proposedTopic: "Edo period",
    });
    expect(result.pendingCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "utterance_review",
          normalizedValue: "Edo period",
          topicDecision: "unclear",
        }),
      ])
    );
  });
});
