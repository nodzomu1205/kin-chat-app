import { describe, expect, it } from "vitest";
import {
  buildFollowUpRule,
  buildGoal,
  buildResolvedMemoryContext,
  resolveTopicFromInputs,
} from "@/lib/app/memoryInterpreterContext";
import type { Memory } from "@/lib/memory";

function buildMemory(overrides?: Partial<Memory>): Memory {
  return {
    facts: [],
    preferences: [],
    lists: {},
    context: {},
    ...overrides,
  };
}

describe("memoryInterpreterContext", () => {
  it("builds goal and follow-up strings from a topic", () => {
    expect(buildGoal("チェーホフ")).toBe("ユーザーはチェーホフについて知りたい");
    expect(buildFollowUpRule("チェーホフ")).toBe(
      "短い追質問は、直前のチェーホフトピックを引き継いで解釈する"
    );
  });

  it("resolves topic from seeded input before other sources", () => {
    expect(
      resolveTopicFromInputs({
        topicSeed: "ドストエフスキー",
        inputText: "チェーホフについて教えて",
        existingTopic: "ロシア文学",
      })
    ).toBe("ドストエフスキー");
  });

  it("preserves the previous last intent for closing replies", () => {
    expect(
      buildResolvedMemoryContext({
        currentMemory: buildMemory({
          context: {
            currentTask: "旧タスク",
            followUpRule: "旧ルール",
            lastUserIntent: "前の意図",
          },
        }),
        resolvedTopic: "チェーホフ",
        inputText: "ありがとう、もう大丈夫です",
      })
    ).toEqual({
      currentTopic: "チェーホフ",
      currentTask: "ユーザーはチェーホフについて知りたい",
      followUpRule: "短い追質問は、直前のチェーホフトピックを引き継いで解釈する",
      lastUserIntent: "前の意図",
    });
  });

  it("uses an explicit lastUserIntent override when provided", () => {
    expect(
      buildResolvedMemoryContext({
        currentMemory: buildMemory({
          context: {
            currentTask: "旧タスク",
            followUpRule: "旧ルール",
            lastUserIntent: "前の意図",
          },
        }),
        resolvedTopic: "チェーホフ",
        inputText: "新しい入力",
        lastUserIntentOverride: "明示的な意図",
      }).lastUserIntent
    ).toBe("明示的な意図");
  });
});
