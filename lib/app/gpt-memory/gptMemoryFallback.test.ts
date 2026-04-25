import { describe, expect, it } from "vitest";
import {
  applyMemoryTopicAdjudication,
  filterPendingMemoryRuleCandidates,
  resolveApprovedMemoryRules,
  suppressRejectedFallbackOptions,
} from "@/lib/app/gpt-memory/gptMemoryFallback";
import type {
  ApprovedMemoryRule,
  PendingMemoryRuleCandidate,
} from "@/lib/memoryInterpreterRules";

const candidateA: PendingMemoryRuleCandidate = {
  id: "cand-a",
  kind: "topic_alias",
  phrase: "Move planning",
  normalizedValue: "Move Planning",
  createdAt: "2026-04-13T00:00:00.000Z",
  sourceText: "We need to move soon.",
};

const candidateB: PendingMemoryRuleCandidate = {
  id: "cand-b",
  kind: "closing_reply",
  phrase: "Thanks, that's enough",
  createdAt: "2026-04-13T00:00:00.000Z",
  sourceText: "Thanks, that's enough.",
};

describe("gptMemoryFallback", () => {
  it("filters rejected memory rule candidates by signature", () => {
    expect(
      filterPendingMemoryRuleCandidates([candidateA, candidateB], [
        "topic_alias|Move Planning",
      ])
    ).toEqual([candidateB]);
  });

  it("filters rejected memory rule candidates by phrase signature", () => {
    expect(
      filterPendingMemoryRuleCandidates([candidateA, candidateB], [
        "topic_alias|Move planning",
      ])
    ).toEqual([candidateB]);
  });

  it("merges base options and fallback options patch", () => {
    expect(
      applyMemoryTopicAdjudication(
        {
          previousCommittedTopic: "Old Topic",
          topicAdjudication: {
            committedTopic: "Old Topic",
          },
        },
        {
          committedTopic: "New Topic",
        }
      )
    ).toEqual({
      previousCommittedTopic: "Old Topic",
      topicAdjudication: {
        committedTopic: "New Topic",
      },
    });
  });

  it("suppresses a rejected topic-alias fallback patch", () => {
    expect(
      suppressRejectedFallbackOptions({
        fallbackResult: {
          adjudication: {
            committedTopic: "Move Planning",
            trackedEntityOverride: "Move Planning",
          },
          pendingCandidates: [candidateA],
          usedFallback: true,
        },
        rejectedSignatures: ["topic_alias|Move Planning"],
      }).adjudication
    ).toEqual({});
  });

  it("prefers runtime approved rules when provided", () => {
    const configured: ApprovedMemoryRule[] = [
      {
        id: "base",
        kind: "topic_alias",
        phrase: "Base",
        normalizedValue: "Base",
        createdAt: "2026-04-13T00:00:00.000Z",
      },
    ];
    const runtime: ApprovedMemoryRule[] = [
      {
        id: "runtime",
        kind: "topic_alias",
        phrase: "Runtime",
        normalizedValue: "Runtime",
        createdAt: "2026-04-13T00:00:00.000Z",
      },
    ];

    expect(resolveApprovedMemoryRules(runtime, configured)).toBe(runtime);
    expect(resolveApprovedMemoryRules(undefined, configured)).toBe(configured);
  });
});
