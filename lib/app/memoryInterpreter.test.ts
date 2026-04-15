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
      json: async () => ({
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
      latestUserText: "最新ユーザー発話",
      recentMessages: [
        {
          id: "g1",
          role: "gpt",
          text: "最新のチャット系GPT通常レス",
          meta: { kind: "normal", sourceType: "gpt_input" },
        },
        { id: "u0", role: "user", text: "さらに一個前の意味あるユーザー発話" },
        { id: "u1", role: "user", text: "ひとつ前のユーザー発話" },
        { id: "u2", role: "user", text: "最新ユーザー発話" },
      ],
      currentMemory: {
        facts: [],
        preferences: [],
        lists: {},
        context: {
          currentTopic: "現在トピック",
          currentTask: "現在タスク",
          followUpRule: "follow",
          lastUserIntent: "直近意図",
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
    expect(payload.input).toContain("CURRENT_TOPIC: 現在トピック");
    expect(payload.input).toContain("CURRENT_TASK: 現在タスク");
    expect(payload.input).toContain("PRIOR_MEANINGFUL_TEXT: 最新のチャット系GPT通常レス");
    expect(payload.input).toContain("EARLIER_MEANINGFUL_TEXT: ひとつ前のユーザー発話");
    expect(payload.input).toContain("LATEST_USER_TEXT_START");
    expect(payload.input).toContain("最新ユーザー発話");
  });

  it("creates a review candidate when keep is returned but a narrower subtopic is present", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
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
      latestUserText: "縄文時代についてもっと詳しく教えて",
      recentMessages: [
        {
          id: "g1",
          role: "gpt",
          text: "日本の歴史は古代から現代まで続いています。",
          meta: { kind: "normal", sourceType: "gpt_input" },
        },
        { id: "u1", role: "user", text: "日本の歴史について教えて" },
        { id: "u2", role: "user", text: "縄文時代についてもっと詳しく教えて" },
      ],
      currentMemory: {
        facts: [],
        preferences: [],
        lists: {},
        context: {
          currentTopic: "日本の歴史",
          currentTask: "ユーザーは日本の歴史について知りたい",
          followUpRule: "follow",
          lastUserIntent: "日本の歴史について教えて",
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
