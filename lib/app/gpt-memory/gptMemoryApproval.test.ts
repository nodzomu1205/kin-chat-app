import { describe, expect, it } from "vitest";
import {
  applyApprovedTopicToKinState,
  applyApprovedTopicToMemory,
  buildApprovedRuleFromCandidate,
  buildApprovedCandidateAdjudication,
  resolveApprovedTopicFromCandidate,
} from "@/lib/app/gpt-memory/gptMemoryApproval";

describe("gptMemoryApproval", () => {
  it("builds topic alias approval commands", () => {
    expect(
      buildApprovedCandidateAdjudication({
        id: "cand-1",
        kind: "topic_alias",
        phrase: "Move planning",
        normalizedValue: "Move Preparation",
        createdAt: "2026-04-13T00:00:00.000Z",
        sourceText: "We need to move soon.",
      })
    ).toEqual(
      expect.objectContaining({
        topicAdjudication: expect.objectContaining({
          committedTopic: "Move Preparation",
          trackedEntityOverride: "Move Preparation",
        }),
      })
    );
  });

  it("builds closing reply keep commands", () => {
    expect(
      buildApprovedCandidateAdjudication({
        id: "cand-2",
        kind: "closing_reply",
        phrase: "Thanks, that's enough",
        createdAt: "2026-04-13T00:00:00.000Z",
        sourceText: "Thanks, that's enough.",
      })
    ).toEqual(
      expect.objectContaining({
        topicAdjudication: expect.objectContaining({
          preserveExistingTopic: true,
        }),
      })
    );
  });

  it("uses the edited topic when keep is approved with a normalized value", () => {
    expect(
      buildApprovedCandidateAdjudication({
        id: "cand-keep",
        kind: "utterance_review",
        phrase: "That does not sound right",
        normalizedValue: "Socrates",
        topicDecision: "keep",
        createdAt: "2026-04-14T00:00:00.000Z",
        sourceText: "That does not sound right",
      })
    ).toEqual(
      expect.objectContaining({
        topicAdjudication: expect.objectContaining({
          committedTopic: "Socrates",
          trackedEntityOverride: "Socrates",
        }),
      })
    );
  });

  it("resolves normalized topic from a candidate", () => {
    expect(
      resolveApprovedTopicFromCandidate({
        id: "cand-3",
        kind: "topic_alias",
        phrase: " Move planning ",
        normalizedValue: " Move Preparation ",
        createdAt: "2026-04-13T00:00:00.000Z",
      })
    ).toBe("Move Preparation");
  });

  it("builds a normalized approved rule from a candidate", () => {
    expect(
      buildApprovedRuleFromCandidate({
        id: "cand-4",
        kind: "topic_alias",
        phrase: " Move planning ",
        normalizedValue: " Move Preparation ",
        createdAt: "2026-04-13T00:00:00.000Z",
        sourceText: "We need to move soon.",
      })
    ).toEqual({
      id: "cand-4",
      kind: "topic_alias",
      phrase: "Move planning",
      normalizedValue: "Move Preparation",
      createdAt: "2026-04-13T00:00:00.000Z",
    });
  });

  it("preserves utterance review pattern metadata when approving a candidate", () => {
    expect(
      buildApprovedRuleFromCandidate({
        id: "cand-5",
        kind: "utterance_review",
        phrase: " That does not sound right ",
        normalizedValue: " Socrates ",
        topicDecision: "keep",
        intent: "disagreement",
        confidence: 0.84,
        evidenceText: " sound right ",
        leftContext: " That does not ",
        rightContext: " . ",
        surfacePattern: " that does not sound right ",
        createdAt: "2026-04-14T00:00:00.000Z",
        sourceText: "That does not sound right",
      })
    ).toEqual({
      id: "cand-5",
      kind: "utterance_review",
      phrase: "That does not sound right",
      normalizedValue: "Socrates",
      topicDecision: "keep",
      intent: "disagreement",
      confidence: 0.84,
      evidenceText: "sound right",
      leftContext: "That does not",
      rightContext: ".",
      surfacePattern: "that does not sound right",
      createdAt: "2026-04-14T00:00:00.000Z",
    });
  });

  it("applies approved topic metadata to memory and clears proposed topic", () => {
    const next = applyApprovedTopicToMemory(
      {
        facts: [],
        preferences: [],
        lists: {
          trackedEntities: ["Old Topic"],
        },
        context: {
          proposedTopic: "Wrong Topic",
        },
      },
      "Approved Topic"
    );

    expect(next.context.currentTopic).toBe("Approved Topic");
    expect(next.context.proposedTopic).toBeUndefined();
    expect(next.context.currentTask).toContain("Approved Topic");
    expect(next.context.followUpRule).toContain("Approved Topic");
    expect(next.lists.trackedEntities).toEqual(["Approved Topic", "Old Topic"]);
  });

  it("applies approved topic metadata to kin state", () => {
    const next = applyApprovedTopicToKinState(
      {
        memory: {
          facts: [],
          preferences: [],
          lists: {},
          context: {
            proposedTopic: "Old Proposal",
          },
        },
        recentMessages: [{ id: "m1", role: "user", text: "hello" }],
      },
      "YouTube Search Task"
    );

    expect(next.memory.context.currentTopic).toBe("YouTube Search Task");
    expect(next.memory.context.proposedTopic).toBeUndefined();
    expect(next.recentMessages).toEqual([{ id: "m1", role: "user", text: "hello" }]);
  });

  it("keeps the current topic and stores a proposal for an unclear utterance review", () => {
    expect(
      buildApprovedCandidateAdjudication({
        id: "cand-unclear",
        kind: "utterance_review",
        phrase: "Tell me about the Edo period",
        normalizedValue: "Edo period",
        topicDecision: "unclear",
        createdAt: "2026-04-15T00:00:00.000Z",
        sourceText: "Tell me about the Edo period",
      })
    ).toEqual(
      expect.objectContaining({
        topicAdjudication: expect.objectContaining({
          preserveExistingTopic: true,
          proposedTopic: "Edo period",
        }),
      })
    );
  });
});
