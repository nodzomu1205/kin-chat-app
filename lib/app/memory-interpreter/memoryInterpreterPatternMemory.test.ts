import { describe, expect, it } from "vitest";
import {
  buildPatternMetadata,
  findBestApprovedMemoryRuleMatch,
  findBestApprovedMemoryRuleMatchWithScore,
  hasStrongApprovedMemoryRuleMatch,
  STRONG_RULE_MATCH_SCORE,
} from "@/lib/app/memory-interpreter/memoryInterpreterPatternMemory";

describe("memoryInterpreterPatternMemory", () => {
  it("builds inferred context around evidence text", () => {
    expect(
      buildPatternMetadata({
        text: "ではプラトンについて教えて下さい",
        evidenceText: "プラトン",
      })
    ).toEqual({
      evidenceText: "プラトン",
      leftContext: "では",
      rightContext: "について教えて下さい",
      surfacePattern: "ではプラトンについて教えて下さい",
    });
  });

  it("prefers evidence and surrounding context over phrase-only matching", () => {
    const matched = findBestApprovedMemoryRuleMatch(
      "それは本当ですか？",
      [
        {
          id: "rule-1",
          phrase: "本当ですか",
          kind: "utterance_review",
          normalizedValue: "ソクラテス",
          topicDecision: "keep",
          createdAt: "2026-04-14T00:00:00.000Z",
        },
        {
          id: "rule-2",
          phrase: "それは本当ですか？",
          kind: "utterance_review",
          normalizedValue: "ソクラテス",
          topicDecision: "keep",
          evidenceText: "本当",
          leftContext: "それは",
          rightContext: "ですか?",
          createdAt: "2026-04-14T00:00:00.000Z",
        },
      ]
    );

    expect(matched?.id).toBe("rule-2");
  });

  it("prefers frequently approved rules over equally-shaped low-signal rules", () => {
    const matched = findBestApprovedMemoryRuleMatch("それは本当ですか？", [
      {
        id: "rule-low",
        phrase: "それは本当ですか？",
        kind: "utterance_review",
        normalizedValue: "topic-a",
        topicDecision: "keep",
        evidenceText: "本当",
        leftContext: "それは",
        rightContext: "ですか?",
        approvedCount: 1,
        createdAt: "2026-04-14T00:00:00.000Z",
      },
      {
        id: "rule-high",
        phrase: "それは本当ですか？",
        kind: "utterance_review",
        normalizedValue: "topic-b",
        topicDecision: "keep",
        evidenceText: "本当",
        leftContext: "それは",
        rightContext: "ですか?",
        approvedCount: 6,
        createdAt: "2026-04-14T00:00:00.000Z",
      },
    ]);

    expect(matched?.id).toBe("rule-high");
  });

  it("penalizes repeatedly rejected rules", () => {
    const matched = findBestApprovedMemoryRuleMatch("それは本当ですか？", [
      {
        id: "rule-rejected",
        phrase: "それは本当ですか？",
        kind: "utterance_review",
        normalizedValue: "topic-a",
        topicDecision: "keep",
        evidenceText: "本当",
        leftContext: "それは",
        rightContext: "ですか?",
        approvedCount: 6,
        rejectedCount: 4,
        createdAt: "2026-04-14T00:00:00.000Z",
      },
      {
        id: "rule-stable",
        phrase: "それは本当ですか？",
        kind: "utterance_review",
        normalizedValue: "topic-b",
        topicDecision: "keep",
        evidenceText: "本当",
        leftContext: "それは",
        rightContext: "ですか?",
        approvedCount: 4,
        rejectedCount: 0,
        createdAt: "2026-04-14T00:00:00.000Z",
      },
    ]);

    expect(matched?.id).toBe("rule-stable");
  });

  it("reports strong contextual matches above the shortcut threshold", () => {
    const result = findBestApprovedMemoryRuleMatchWithScore("それは本当ですか？", [
      {
        id: "rule-strong",
        phrase: "それは本当ですか？",
        kind: "utterance_review",
        normalizedValue: "topic-b",
        topicDecision: "keep",
        evidenceText: "本当",
        leftContext: "それは",
        rightContext: "ですか?",
        approvedCount: 3,
        createdAt: "2026-04-14T00:00:00.000Z",
      },
    ]);

    expect(result.rule?.id).toBe("rule-strong");
    expect(result.score).toBeGreaterThanOrEqual(STRONG_RULE_MATCH_SCORE);
    expect(
      hasStrongApprovedMemoryRuleMatch("それは本当ですか？", [
        {
          id: "rule-strong",
          phrase: "それは本当ですか？",
          kind: "utterance_review",
          normalizedValue: "topic-b",
          topicDecision: "keep",
          evidenceText: "本当",
          leftContext: "それは",
          rightContext: "ですか?",
          approvedCount: 3,
          createdAt: "2026-04-14T00:00:00.000Z",
        },
      ])
    ).toBe(true);
  });

  it("treats weak phrase-only matches as insufficient for skipping llm adjudication", () => {
    const result = findBestApprovedMemoryRuleMatchWithScore("それは本当ですか？", [
      {
        id: "rule-weak",
        phrase: "本当ですか",
        kind: "utterance_review",
        normalizedValue: "topic-b",
        topicDecision: "keep",
        approvedCount: 1,
        createdAt: "2026-04-14T00:00:00.000Z",
      },
    ]);

    expect(result.rule?.id).toBe("rule-weak");
    expect(result.score).toBeLessThan(STRONG_RULE_MATCH_SCORE);
    expect(
      hasStrongApprovedMemoryRuleMatch("それは本当ですか？", [
        {
          id: "rule-weak",
          phrase: "本当ですか",
          kind: "utterance_review",
          normalizedValue: "topic-b",
          topicDecision: "keep",
          approvedCount: 1,
          createdAt: "2026-04-14T00:00:00.000Z",
        },
      ])
    ).toBe(false);
  });
});
