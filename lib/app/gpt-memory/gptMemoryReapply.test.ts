import { describe, expect, it } from "vitest";
import {
  buildRejectedCandidateReapplyMemory,
  getReapplicableRecentMessages,
  mergeApprovedRulesWithCandidate,
} from "@/lib/app/gpt-memory/gptMemoryReapply";

describe("gptMemoryReapply", () => {
  it("returns recent messages when present", () => {
    expect(
      getReapplicableRecentMessages({
        memory: {
          facts: [],
          preferences: [],
          lists: {},
          context: {},
        },
        recentMessages: [{ id: "m1", role: "user", text: "hello" }],
      })
    ).toEqual([{ id: "m1", role: "user", text: "hello" }]);
  });

  it("merges an approved candidate in front of existing rules", () => {
    expect(
      mergeApprovedRulesWithCandidate(
        {
          id: "cand-1",
          kind: "topic_alias",
          phrase: " Move planning ",
          normalizedValue: " Move Preparation ",
          createdAt: "2026-04-13T00:00:00.000Z",
          sourceText: "We need to move soon.",
        },
        [
          {
            id: "rule-1",
            kind: "closing_reply",
            phrase: "Thanks",
            createdAt: "2026-04-13T00:00:00.000Z",
          },
        ]
      )
    ).toEqual([
      {
        id: "cand-1",
        kind: "topic_alias",
        phrase: "Move planning",
        normalizedValue: "Move Preparation",
        createdAt: "2026-04-13T00:00:00.000Z",
      },
      {
        id: "rule-1",
        kind: "closing_reply",
        phrase: "Thanks",
        createdAt: "2026-04-13T00:00:00.000Z",
      },
    ]);
  });

  it("builds a clean reapply memory when a candidate is rejected", () => {
    expect(
      buildRejectedCandidateReapplyMemory(
        {
          facts: ["Wrong topic fact"],
          preferences: ["pref-a"],
          lists: {
            activeDocument: { title: "Doc A" },
            recentSearchQueries: ["query-a"],
            trackedEntities: ["Move Preparation", "Other"],
          },
          context: {
            currentTopic: "Move Preparation",
            currentTask: "User wants to know about Move Preparation",
            followUpRule: "Short follow-ups inherit Move Preparation",
            lastUserIntent: "Tell me about moving",
          },
        },
        {
          id: "cand-1",
          kind: "topic_alias",
          phrase: "move",
          normalizedValue: "Move Preparation",
          createdAt: "2026-04-13T00:00:00.000Z",
          sourceText: "We need to move soon.",
        }
      )
    ).toEqual({
      facts: [],
      preferences: ["pref-a"],
      lists: {
        activeDocument: { title: "Doc A" },
        recentSearchQueries: ["query-a"],
        trackedEntities: ["Other"],
      },
      context: {
        currentTopic: undefined,
        proposedTopic: undefined,
        lastUserIntent: "Tell me about moving",
      },
    });
  });
});
