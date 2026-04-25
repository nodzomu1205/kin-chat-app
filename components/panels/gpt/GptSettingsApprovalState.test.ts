import { describe, expect, it } from "vitest";
import {
  buildOriginalSuggestedTopicMap,
  buildTopicDecisionPatch,
  MEMORY_INTENT_OPTIONS,
  resolveMemoryReviewTopicInputValue,
  TOPIC_DECISION_OPTIONS,
} from "@/components/panels/gpt/GptSettingsApprovalState";
import type { PendingMemoryRuleCandidate } from "@/lib/memory-domain/memoryInterpreterRules";

const baseCandidate: PendingMemoryRuleCandidate = {
  id: "candidate-1",
  kind: "utterance_review",
  phrase: "switch to project alpha",
  sourceText: "let's switch to project alpha",
  normalizedValue: "Project Alpha",
  createdAt: "2026-04-25T00:00:00.000Z",
};

describe("GptSettingsApprovalState", () => {
  it("exposes stable memory review option sets", () => {
    expect(MEMORY_INTENT_OPTIONS).toContain("acknowledgement");
    expect(TOPIC_DECISION_OPTIONS).toEqual(["keep", "switch", "unclear"]);
  });

  it("keeps original suggested topics only for utterance reviews", () => {
    expect(
      buildOriginalSuggestedTopicMap([
        baseCandidate,
        {
          ...baseCandidate,
          id: "candidate-2",
          kind: "topic_alias",
          normalizedValue: "Ignored",
        },
      ])
    ).toEqual({
      "candidate-1": "Project Alpha",
    });
  });

  it("resolves topic input values from decision and current topic", () => {
    expect(
      resolveMemoryReviewTopicInputValue({
        candidate: {
          ...baseCandidate,
          topicDecision: "keep",
          normalizedValue: "Project Beta",
        },
        currentTopic: "Current Topic",
        originalSuggestedTopic: "Project Alpha",
      })
    ).toBe("Project Beta");

    expect(
      resolveMemoryReviewTopicInputValue({
        candidate: {
          ...baseCandidate,
          topicDecision: "keep",
          normalizedValue: "Project Alpha",
        },
        currentTopic: "Current Topic",
        originalSuggestedTopic: "Project Alpha",
      })
    ).toBe("Current Topic");

    expect(
      resolveMemoryReviewTopicInputValue({
        candidate: {
          ...baseCandidate,
          topicDecision: "switch",
          normalizedValue: "",
        },
        currentTopic: "Current Topic",
        originalSuggestedTopic: "Project Alpha",
      })
    ).toBe("Project Alpha");
  });

  it("builds topic decision patches without losing suggested switch topics", () => {
    expect(
      buildTopicDecisionPatch({
        candidate: baseCandidate,
        nextDecision: "switch",
        currentTopic: "Current Topic",
        originalSuggestedTopic: "Project Alpha",
      })
    ).toEqual({
      kind: "utterance_review",
      topicDecision: "switch",
      normalizedValue: "Project Alpha",
    });

    expect(
      buildTopicDecisionPatch({
        candidate: baseCandidate,
        nextDecision: "keep",
        currentTopic: "Current Topic",
        originalSuggestedTopic: "Project Alpha",
      })
    ).toEqual({
      kind: "utterance_review",
      topicDecision: "keep",
      normalizedValue: "Current Topic",
    });
  });
});
