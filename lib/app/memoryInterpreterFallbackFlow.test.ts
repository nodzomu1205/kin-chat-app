import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildMemoryFallbackRequestInput,
  buildSafeFallbackFailureResult,
  resolveMemoryFallbackFlow,
} from "@/lib/app/memoryInterpreterFallbackFlow";

const fetchMock = vi.fn();

describe("memoryInterpreterFallbackFlow", () => {
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("builds fallback prompt input with the latest meaningful conversation context", () => {
    const prompt = buildMemoryFallbackRequestInput({
      latestUserText: "最新の相談です",
      recentMessages: [
        {
          id: "g1",
          role: "gpt",
          text: "最初のチャット系GPTレス",
          meta: { kind: "normal", sourceType: "gpt_input" },
        },
        {
          id: "u0",
          role: "user",
          text: "少し前のユーザー相談",
        },
        {
          id: "g2",
          role: "gpt",
          text: "最新のタスク系GPTレス",
          meta: { kind: "task_prep", sourceType: "gpt_input" },
        },
        { id: "u1", role: "user", text: "最新の相談です" },
      ],
      currentMemory: {
        facts: [],
        preferences: [],
        lists: {},
        context: {
          currentTopic: "現在トピック",
          currentTask: "現在タスク",
          lastUserIntent: "直前意図",
        },
      },
    });

    expect(prompt).toContain("CURRENT_TOPIC: 現在トピック");
    expect(prompt).toContain("CURRENT_TASK: 現在タスク");
    expect(prompt).toContain("LAST_USER_INTENT: 直前意図");
    expect(prompt).toContain("PRIOR_MEANINGFUL_TEXT: 最新のタスク系GPTレス");
    expect(prompt).toContain("EARLIER_MEANINGFUL_TEXT: 少し前のユーザー相談");
    expect(prompt).toContain("LATEST_USER_TEXT_START");
    expect(prompt).toContain("最新の相談です");
  });

  it("falls back to preserving the current topic when response parsing fails", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ reply: "not json" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveMemoryFallbackFlow({
      latestUserText: "hello",
      recentMessages: [],
      currentMemory: {
        facts: [],
        preferences: [],
        lists: {},
        context: { currentTopic: "ソクラテス" },
      },
      settings: {
        llmFallbackEnabled: true,
        saveRuleCandidates: true,
      },
    });

    expect(result).toEqual(
      expect.objectContaining(buildSafeFallbackFailureResult({
        facts: [],
        preferences: [],
        lists: {},
        context: { currentTopic: "ソクラテス" },
      }))
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
      json: async () => ({
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
      latestUserText: "最初の雑談です",
      recentMessages: [{ id: "u1", role: "user", text: "最初の雑談です" }],
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
      json: async () => ({
        reply: JSON.stringify({
          decision: "switch",
          confidence: 0.97,
          intent: "question",
          proposedTopic: "江戸時代",
          topic: "江戸時代",
          isClosingReply: false,
          trackedEntity: null,
        }),
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveMemoryFallbackFlow({
      latestUserText: "じゃあ江戸時代については？",
      recentMessages: [
        {
          id: "g1",
          role: "gpt",
          text: "日本の歴史の中でも明治時代は大きな変化がありました。",
          meta: { kind: "normal" },
        },
        { id: "u1", role: "user", text: "じゃあ江戸時代については？" },
      ],
      currentMemory: {
        facts: [],
        preferences: [],
        lists: {},
        context: { currentTopic: "日本の歴史" },
      },
      settings: {
        llmFallbackEnabled: true,
        saveRuleCandidates: true,
      },
    });

    expect(result.adjudication).toEqual({
      disableInputTopicInference: true,
      preserveExistingTopic: true,
      proposedTopic: "江戸時代",
    });
    expect(result.pendingCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "utterance_review",
          normalizedValue: "江戸時代",
          topicDecision: "unclear",
        }),
      ])
    );
  });
});
