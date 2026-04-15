import { describe, expect, it } from "vitest";
import {
  buildCommittedTopicAdjudication,
  buildFallbackTopicAdjudication,
  buildPreserveTopicAdjudication,
  buildRuleTopicAdjudication,
} from "@/lib/app/memoryTopicAdjudication";

describe("memoryTopicAdjudication", () => {
  it("builds a committed topic adjudication", () => {
    expect(
      buildCommittedTopicAdjudication({
        topic: " Edo period ",
        trackedEntityOverride: " Edo period ",
      })
    ).toEqual({
      disableInputTopicInference: true,
      committedTopic: "Edo period",
      trackedEntityOverride: "Edo period",
      proposedTopic: undefined,
      preserveExistingTopic: false,
    });
  });

  it("builds a preserve-topic adjudication", () => {
    expect(buildPreserveTopicAdjudication(" Meiji period ")).toEqual({
      disableInputTopicInference: true,
      preserveExistingTopic: true,
      proposedTopic: "Meiji period",
    });
  });

  it("normalizes legacy keep rules", () => {
    expect(
      buildRuleTopicAdjudication({
        kind: "closing_reply",
      })
    ).toEqual({
      disableInputTopicInference: true,
      preserveExistingTopic: true,
      proposedTopic: undefined,
    });
  });

  it("normalizes legacy switch rules", () => {
    expect(
      buildRuleTopicAdjudication({
        kind: "topic_alias",
        normalizedValue: " Move planning ",
      })
    ).toEqual({
      disableInputTopicInference: true,
      committedTopic: "Move planning",
      trackedEntityOverride: "Move planning",
      proposedTopic: undefined,
      preserveExistingTopic: false,
    });
  });

  it("commits an initial fallback topic only on the first topic seed path", () => {
    expect(
      buildFallbackTopicAdjudication({
        hasCurrentTopic: false,
        isTruthCheckQuestion: false,
        isClosingReply: false,
        parsedDecision: "keep",
        parsedConfidence: 0.9,
        currentTopic: "",
        proposedTopic: "weather",
        trackedEntityOverride: "weather",
      })
    ).toEqual({
      disableInputTopicInference: true,
      committedTopic: "weather",
      trackedEntityOverride: "weather",
      proposedTopic: undefined,
      preserveExistingTopic: false,
    });
  });

  it("preserves the current topic for mid-conversation fallback switches", () => {
    expect(
      buildFallbackTopicAdjudication({
        hasCurrentTopic: true,
        isTruthCheckQuestion: false,
        isClosingReply: false,
        parsedDecision: "switch",
        parsedConfidence: 0.95,
        currentTopic: "Japanese history",
        proposedTopic: "Edo period",
      })
    ).toEqual({
      disableInputTopicInference: true,
      preserveExistingTopic: true,
      proposedTopic: "Edo period",
    });
  });
});
