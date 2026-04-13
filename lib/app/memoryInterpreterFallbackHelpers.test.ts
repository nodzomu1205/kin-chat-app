import { describe, expect, it } from "vitest";
import {
  applyApprovedMemoryRule,
  buildMemoryFallbackPrompt,
  shouldUseMemoryFallback,
  tryParseMemoryFallbackJson,
} from "@/lib/app/memoryInterpreterFallbackHelpers";

describe("memoryInterpreterFallbackHelpers", () => {
  it("applies approved topic alias rules", () => {
    expect(
      applyApprovedMemoryRule("次は move planning", [
        {
          id: "rule-1",
          phrase: "move planning",
          kind: "topic_alias",
          normalizedValue: "Move Planning",
          createdAt: "2026-04-13T00:00:00.000Z",
        },
      ])
    ).toEqual({
      topicSeed: "Move Planning",
      trackedEntityOverride: "Move Planning",
    });
  });

  it("detects when fallback should run", () => {
    expect(shouldUseMemoryFallback("では次はもう少し詳しく比較して")).toBe(true);
    expect(shouldUseMemoryFallback("検索: 東京の天気")).toBe(false);
  });

  it("parses json embedded in surrounding text", () => {
    expect(
      tryParseMemoryFallbackJson(
        'prefix {"topic":"Tokyo","isClosingReply":false} suffix'
      )
    ).toEqual({
      topic: "Tokyo",
      isClosingReply: false,
    });
  });

  it("builds a memory fallback prompt with current context", () => {
    const prompt = buildMemoryFallbackPrompt({
      latestUserText: "では次はチェーホフで",
      currentTopic: "ロシア文学",
      lastUserIntent: "作家を比較したい",
    });

    expect(prompt).toContain("CURRENT_TOPIC: ロシア文学");
    expect(prompt).toContain("LAST_USER_INTENT: 作家を比較したい");
    expect(prompt).toContain("LATEST_USER_TEXT_START");
  });
});
