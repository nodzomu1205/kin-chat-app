import { describe, expect, it } from "vitest";
import { reduceTopicAdjudication } from "@/lib/app/memoryInterpreterTopicReducer";
import type { MemoryUtteranceClassification } from "@/lib/app/memoryInterpreterUtterance";

function buildUtterance(
  overrides?: Partial<MemoryUtteranceClassification>
): MemoryUtteranceClassification {
  return {
    normalizedText: "Tell me about the Edo period",
    currentTopic: "Japanese history",
    hasCurrentTopic: true,
    localTopicCandidate: "Edo period",
    possibleSubtopic: "Edo period",
    weakTopicCandidate: false,
    looksLikeQuestionOrRequest: true,
    isSearchDirective: false,
    isClosingReply: false,
    isShortAcknowledgement: false,
    isGenericFollowUpRequest: false,
    isGenericContinuationQuestion: false,
    isGenericCorrectionReply: false,
    isCorrectionOrDispute: false,
    isTruthCheckQuestion: false,
    preservesExistingTopic: false,
    looksLikeLongNarrative: false,
    ...overrides,
  };
}

describe("memoryInterpreterTopicReducer", () => {
  it("keeps the current topic but emits a review candidate for a possible subtopic", () => {
    const result = reduceTopicAdjudication({
      latestUserText: "Tell me about the Edo period",
      utterance: buildUtterance(),
      parsed: {
        decision: "keep",
        confidence: 0.92,
        intent: "question",
        proposedTopic: null,
        topic: null,
        isClosingReply: false,
        trackedEntity: null,
      },
      saveRuleCandidates: true,
    });

    expect(result.adjudication).toEqual({
      disableInputTopicInference: true,
      preserveExistingTopic: true,
      proposedTopic: undefined,
    });
    expect(result.pendingCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "utterance_review",
          normalizedValue: "Edo period",
          topicDecision: "unclear",
          confidence: 0.92,
        }),
      ])
    );
  });

  it("stores a proposed topic instead of auto-switching during an active conversation", () => {
    const result = reduceTopicAdjudication({
      latestUserText: "What about the Meiji period?",
      utterance: buildUtterance({
        normalizedText: "What about the Meiji period?",
        currentTopic: "Japanese history",
        localTopicCandidate: "Meiji period",
        possibleSubtopic: "Meiji period",
      }),
      parsed: {
        decision: "switch",
        confidence: 0.96,
        intent: "question",
        proposedTopic: "Meiji period",
        topic: "Meiji period",
        isClosingReply: false,
        trackedEntity: null,
      },
      saveRuleCandidates: true,
    });

    expect(result.adjudication).toEqual({
      disableInputTopicInference: true,
      preserveExistingTopic: true,
      proposedTopic: "Meiji period",
    });
    expect(result.pendingCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "utterance_review",
          normalizedValue: "Meiji period",
          topicDecision: "unclear",
          confidence: 0.96,
        }),
      ])
    );
  });

  it("does not auto-switch on a closing reply", () => {
    const result = reduceTopicAdjudication({
      latestUserText: "Okay, this was just a test.",
      utterance: buildUtterance({
        normalizedText: "Okay, this was just a test.",
        localTopicCandidate: "",
        possibleSubtopic: "",
        weakTopicCandidate: true,
        looksLikeQuestionOrRequest: false,
        isClosingReply: true,
      }),
      parsed: {
        decision: "switch",
        confidence: 0.96,
        intent: "acknowledgement",
        proposedTopic: "test",
        topic: "test",
        isClosingReply: true,
        trackedEntity: null,
      },
      saveRuleCandidates: true,
    });

    expect(result.adjudication).toEqual({
      disableInputTopicInference: true,
      preserveExistingTopic: true,
      proposedTopic: undefined,
    });
    expect(result.pendingCandidates).toEqual([]);
  });

  it("stores evidence metadata on utterance review candidates", () => {
    const result = reduceTopicAdjudication({
      latestUserText: "That does not sound right.",
      utterance: buildUtterance({
        normalizedText: "That does not sound right.",
        currentTopic: "Socrates",
        localTopicCandidate: "",
        possibleSubtopic: "",
        weakTopicCandidate: true,
        isTruthCheckQuestion: true,
      }),
      parsed: {
        decision: "keep",
        confidence: 0.88,
        intent: "disagreement",
        proposedTopic: null,
        topic: null,
        isClosingReply: false,
        trackedEntity: null,
        evidenceText: "sound right",
        leftContext: "That does not",
        rightContext: ".",
        surfacePattern: "that does not sound right",
      },
      saveRuleCandidates: true,
    });

    expect(result.pendingCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "utterance_review",
          evidenceText: "sound right",
          leftContext: "That does not",
          rightContext: ".",
          surfacePattern: "that does not sound right",
        }),
      ])
    );
  });

  it("adopts the llm topic on an initial turn when no current topic exists", () => {
    const result = reduceTopicAdjudication({
      latestUserText: "The weather has been awful lately.",
      utterance: buildUtterance({
        normalizedText: "The weather has been awful lately.",
        currentTopic: "",
        hasCurrentTopic: false,
        localTopicCandidate: "",
        possibleSubtopic: "",
        weakTopicCandidate: true,
        looksLikeQuestionOrRequest: false,
      }),
      parsed: {
        decision: "keep",
        confidence: 0.9,
        intent: "statement",
        proposedTopic: null,
        topic: "weather",
        isClosingReply: false,
        trackedEntity: null,
        evidenceText: "weather",
        leftContext: null,
        rightContext: null,
        surfacePattern: "weather has been awful lately",
      },
      saveRuleCandidates: true,
    });

    expect(result.adjudication).toEqual({
      disableInputTopicInference: true,
      committedTopic: "weather",
      trackedEntityOverride: "weather",
      proposedTopic: undefined,
      preserveExistingTopic: false,
    });
  });


  it("raises a review candidate when llm keep points to a different topic", () => {
    const result = reduceTopicAdjudication({
      latestUserText: "Tell me more about the Edo period",
      utterance: buildUtterance({
        normalizedText: "Tell me more about the Edo period",
        currentTopic: "Japanese history",
        localTopicCandidate: "",
        possibleSubtopic: "",
      }),
      parsed: {
        decision: "keep",
        confidence: 0.91,
        intent: "request",
        proposedTopic: null,
        topic: "Edo period",
        isClosingReply: false,
        trackedEntity: null,
      },
      saveRuleCandidates: true,
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
