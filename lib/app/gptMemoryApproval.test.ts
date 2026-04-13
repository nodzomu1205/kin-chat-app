import { describe, expect, it } from "vitest";
import {
  applyApprovedTopicToKinState,
  applyApprovedTopicToMemory,
  buildApprovedCandidateOptionsPatch,
  resolveApprovedTopicFromCandidate,
} from "@/lib/app/gptMemoryApproval";

describe("gptMemoryApproval", () => {
  it("builds topic alias options patch", () => {
    expect(
      buildApprovedCandidateOptionsPatch({
        id: "cand-1",
        kind: "topic_alias",
        phrase: "Move planning",
        normalizedValue: "Move Preparation",
        createdAt: "2026-04-13T00:00:00.000Z",
        sourceText: "We need to move soon.",
      })
    ).toEqual({
      topicSeed: "Move Preparation",
      trackedEntityOverride: "Move Preparation",
    });
  });

  it("builds closing reply override patch", () => {
    expect(
      buildApprovedCandidateOptionsPatch({
        id: "cand-2",
        kind: "closing_reply",
        phrase: "Thanks, that's enough",
        createdAt: "2026-04-13T00:00:00.000Z",
        sourceText: "Thanks, that's enough.",
      })
    ).toEqual({
      closingReplyOverride: true,
    });
  });

  it("resolves normalized topic from candidate", () => {
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

  it("applies approved topic metadata to memory", () => {
    expect(
      applyApprovedTopicToMemory(
        {
          facts: [],
          preferences: [],
          lists: {
            trackedEntities: ["Old Topic"],
          },
          context: {},
        },
        "引っ越し準備"
      )
    ).toEqual({
      facts: [],
      preferences: [],
      lists: {
        trackedEntities: ["引っ越し準備", "Old Topic"],
      },
      context: {
        currentTopic: "引っ越し準備",
        currentTask: "ユーザーは引っ越し準備について知りたい",
        followUpRule: "短い追質問は、直前の引っ越し準備トピックを引き継いで解釈する",
      },
    });
  });

  it("applies approved topic metadata to kin state", () => {
    const next = applyApprovedTopicToKinState(
      {
        memory: {
          facts: [],
          preferences: [],
          lists: {},
          context: {},
        },
        recentMessages: [{ id: "m1", role: "user", text: "hello" }],
      },
      "YouTube検索タスク"
    );

    expect(next.memory.context.currentTopic).toBe("YouTube検索タスク");
    expect(next.recentMessages).toEqual([{ id: "m1", role: "user", text: "hello" }]);
  });
});
