import { describe, expect, it } from "vitest";
import type { PendingIntentCandidate } from "@/lib/task/taskIntentPhraseState";
import {
  buildNextApprovedIntentPhrasesOnApprove,
  filterPendingIntentCandidatesAgainstApproved,
  formatIntentCandidateDraftText,
  normalizeApprovedIntentPhraseFromCandidate,
  parseIntentCandidateDraftText,
} from "@/lib/task/taskIntentPhraseState";

describe("parseIntentCandidateDraftText", () => {
  it("still parses edited char_limit sentences", () => {
    const fallback: PendingIntentCandidate = {
      id: "cand-char",
      phrase: "limit output to 1000 characters",
      kind: "char_limit",
      sourceText: "limit output to 1000 characters",
      draftText: "Please summarize in up to 1000 characters.",
      createdAt: "2026-04-19T00:00:00.000Z",
    };

    expect(
      parseIntentCandidateDraftText(
        "Please keep the final output at least 1000 characters.",
        fallback
      )
    ).toEqual(
      expect.objectContaining({
        kind: "char_limit",
        charLimit: 1000,
        rule: "at_least",
      })
    );
  });

  it("still parses edited GPT request sentences", () => {
    const fallback: PendingIntentCandidate = {
      id: "cand-gpt",
      phrase: "request GPT up to 3 times",
      kind: "ask_gpt",
      sourceText: "request GPT up to 3 times",
      draftText: "Limit the requests to GPT to a maximum of 3 times.",
      createdAt: "2026-04-19T00:00:00.000Z",
    };

    expect(
      parseIntentCandidateDraftText(
        "Limit the requests to GPT to a maximum of 3 times.",
        fallback
      )
    ).toEqual(
      expect.objectContaining({
        kind: "ask_gpt",
        count: 3,
        rule: "up_to",
      })
    );
  });
});

describe("normalizeApprovedIntentPhraseFromCandidate", () => {
  it("keeps inferred metadata while preserving the deterministic constraint line", () => {
    const candidate: PendingIntentCandidate = {
      id: "cand-approved",
      phrase: "search up to 2 times",
      kind: "search_request",
      count: 2,
      rule: "up_to",
      sourceText: "search up to 2 times",
      draftText: "Limit the searches to a maximum of 2 times.",
      approvedCount: 0,
      rejectedCount: 0,
      createdAt: "2026-04-19T00:00:00.000Z",
    };

    expect(normalizeApprovedIntentPhraseFromCandidate(candidate)).toEqual(
      expect.objectContaining({
        id: "cand-approved",
        phrase: "search up to 2 times",
        kind: "search_request",
        count: 2,
        rule: "up_to",
        draftText: "Limit the searches to a maximum of 2 times.",
      })
    );
  });

  it("treats semantically identical approved constraints as the same phrase even when wording differs", () => {
    const pendingIntentCandidates: PendingIntentCandidate[] = [
      {
        id: "cand-approved",
        phrase: "search the web at most 2 times",
        kind: "search_request",
        count: 2,
        rule: "up_to",
        sourceText: "search the web at most 2 times",
        draftText: "Perform up to 2 searches.",
        approvedCount: 0,
        rejectedCount: 0,
        createdAt: "2026-04-19T00:00:00.000Z",
      },
    ];

    const next = buildNextApprovedIntentPhrasesOnApprove({
      pendingIntentCandidates,
      approvedIntentPhrases: [
        {
          id: "approved-existing",
          phrase: "search up to 2 times",
          kind: "search_request",
          count: 2,
          rule: "up_to",
          draftText: "Perform up to 2 searches.",
          approvedCount: 1,
          rejectedCount: 0,
          createdAt: "2026-04-18T00:00:00.000Z",
        },
      ],
      candidateId: "cand-approved",
    });

    expect(next).toHaveLength(1);
    expect(next[0]).toEqual(
      expect.objectContaining({
        id: "approved-existing",
        approvedCount: 2,
        draftText: "Perform up to 2 searches.",
      })
    );
  });

  it("filters pending candidates that are already covered by approved constraints", () => {
    expect(
      filterPendingIntentCandidatesAgainstApproved({
        pendingIntentCandidates: [
          {
            id: "cand-approved",
            phrase: "search the web at most 2 times",
            kind: "search_request",
            count: 2,
            rule: "up_to",
            sourceText: "search the web at most 2 times",
            draftText: "Perform up to 2 searches.",
            createdAt: "2026-04-19T00:00:00.000Z",
          },
          {
            id: "cand-fresh",
            phrase: "ask ChatGPT exactly 1 time",
            kind: "ask_gpt",
            count: 1,
            rule: "exact",
            sourceText: "ask ChatGPT exactly 1 time",
            draftText: "Make exactly 1 request to GPT.",
            createdAt: "2026-04-19T00:00:00.000Z",
          },
        ],
        approvedIntentPhrases: [
          {
            id: "approved-existing",
            phrase: "search up to 2 times",
            kind: "search_request",
            count: 2,
            rule: "up_to",
            draftText: "Perform up to 2 searches.",
            approvedCount: 1,
            rejectedCount: 0,
            createdAt: "2026-04-18T00:00:00.000Z",
          },
        ],
      })
    ).toEqual([expect.objectContaining({ id: "cand-fresh" })]);
  });
});

describe("formatIntentCandidateDraftText", () => {
  it("keeps up_to and exact request constraints distinct", () => {
    expect(
      formatIntentCandidateDraftText({
        kind: "ask_gpt",
        count: 3,
        rule: "up_to",
      })
    ).toBe("Make up to 3 requests to GPT.");

    expect(
      formatIntentCandidateDraftText({
        kind: "ask_gpt",
        count: 3,
        rule: "exact",
      })
    ).toBe("Make exactly 3 requests to GPT.");
  });

  it("uses fixed phrasing for search, transcript, library, and user-question constraints", () => {
    expect(
      formatIntentCandidateDraftText({
        kind: "search_request",
        count: 2,
        rule: "up_to",
      })
    ).toBe("Perform up to 2 searches.");

    expect(
      formatIntentCandidateDraftText({
        kind: "youtube_transcript_request",
        count: 2,
        rule: "exact",
      })
    ).toBe("Fetch exactly 2 YouTube transcripts.");

    expect(
      formatIntentCandidateDraftText({
        kind: "library_index_request",
        count: 1,
        rule: "up_to",
      })
    ).toBe("Request up to 1 library index entry.");

    expect(
      formatIntentCandidateDraftText({
        kind: "library_item_request",
        count: 2,
        rule: "at_least",
      })
    ).toBe("Request at least 2 library content items.");

    expect(
      formatIntentCandidateDraftText({
        kind: "ask_user",
        count: 3,
        rule: "around",
      })
    ).toBe("Ask around 3 questions to the user.");
  });

  it("uses singular and plural forms naturally", () => {
    expect(
      formatIntentCandidateDraftText({
        kind: "search_request",
        count: 1,
        rule: "exact",
      })
    ).toBe("Perform exactly 1 search.");

    expect(
      formatIntentCandidateDraftText({
        kind: "youtube_transcript_request",
        count: 2,
        rule: "up_to",
      })
    ).toBe("Fetch up to 2 YouTube transcripts.");
  });
});
