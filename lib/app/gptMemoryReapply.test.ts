import { describe, expect, it } from "vitest";
import {
  getReapplicableRecentMessages,
  mergeApprovedRulesWithCandidate,
} from "@/lib/app/gptMemoryReapply";

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
});
