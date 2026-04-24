import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveMemoryFallbackOptions } from "@/lib/app/memoryInterpreter";

const fetchMock = vi.fn();

describe("memoryInterpreter", () => {
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("passes current topic and meaningful GPT context to memory_interpret", async () => {
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

    await resolveMemoryFallbackOptions({
      latestUserText: "latest user question",
      recentMessages: [
        {
          id: "g1",
          role: "gpt",
          text: "latest normal gpt reply",
          meta: { kind: "normal", sourceType: "gpt_input" },
        },
        { id: "u0", role: "user", text: "older user question" },
        { id: "u1", role: "user", text: "earlier user question" },
        { id: "u2", role: "user", text: "latest user question" },
      ],
      currentMemory: {
        facts: [],
        preferences: [],
        lists: {},
        context: {
          currentTopic: "Current Topic",
          currentTask: "Current Task",
          followUpRule: "follow",
          lastUserIntent: "Last Intent",
        },
      },
      settings: {
        llmFallbackEnabled: true,
        saveRuleCandidates: true,
      },
      approvedRules: [],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, request] = fetchMock.mock.calls[0];
    const payload = JSON.parse(String((request as RequestInit).body));
    expect(payload.mode).toBe("memory_interpret");
    expect(payload.input).toContain("TOPIC: Current Topic");
    expect(payload.input).toContain("TASK: Current Task");
    expect(payload.input).toContain("PRIOR: latest normal gpt reply");
    expect(payload.input).toContain("EARLIER: earlier user question");
    expect(payload.input).toContain("USER:");
    expect(payload.input).toContain("latest user question");
  });

  it("creates a review candidate when keep is returned but a narrower subtopic is present", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          reply: JSON.stringify({
            decision: "keep",
            confidence: 0.93,
            intent: "question",
            proposedTopic: null,
            topic: null,
            isClosingReply: false,
            trackedEntity: null,
          }),
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveMemoryFallbackOptions({
      latestUserText: "tell me more about the Edo period",
      recentMessages: [
        {
          id: "g1",
          role: "gpt",
          text: "We are discussing Japanese history.",
          meta: { kind: "normal", sourceType: "gpt_input" },
        },
        { id: "u1", role: "user", text: "tell me about Japanese history" },
        { id: "u2", role: "user", text: "tell me more about the Edo period" },
      ],
      currentMemory: {
        facts: [],
        preferences: [],
        lists: {},
        context: {
          currentTopic: "Japanese history",
          currentTask: "Answer questions about Japanese history",
          followUpRule: "follow",
          lastUserIntent: "tell me about Japanese history",
        },
      },
      settings: {
        llmFallbackEnabled: true,
        saveRuleCandidates: true,
      },
      approvedRules: [],
    });

    expect(result.usedFallback).toBe(true);
    expect(result.adjudication.preserveExistingTopic).toBe(true);
    expect(result.pendingCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "utterance_review",
          topicDecision: "unclear",
        }),
      ])
    );
  });
});
