import { afterEach, describe, expect, it, vi } from "vitest";
import {
  normalizeApprovedIntentPhraseFromCandidate,
  parseIntentCandidateDraftText,
  parseTaskIntentFromText,
  resolveTaskIntentWithFallback,
  type ApprovedIntentPhrase,
  type PendingIntentCandidate,
} from "@/lib/taskIntent";
import {
  buildTaskIntentFallbackPrompt,
  extractTaskIntentFallbackPayload,
} from "@/lib/taskIntentFallback";

const CLEAN_INPUT =
  "Analyze the YouTube transcript and use Google search to prepare an analysis.";

describe("parseTaskIntentFromText", () => {
  it("keeps count-based workflow empty until phrases are approved", () => {
    const intent = parseTaskIntentFromText(CLEAN_INPUT);

    expect(intent.workflow?.allowSearchRequest).toBe(true);
    expect(intent.workflow?.allowYoutubeTranscriptRequest).toBe(true);
    expect(intent.workflow?.searchRequestCount).toBeUndefined();
    expect(intent.workflow?.youtubeTranscriptRequestCount).toBeUndefined();
  });

  it("applies approved intent phrases when matching text includes the phrase", () => {
    const approved: ApprovedIntentPhrase[] = [
      {
        id: "approved-1",
        phrase: "search up to 3 times",
        kind: "search_request",
        count: 3,
        rule: "up_to",
        createdAt: "2026-04-13T00:00:00.000Z",
      },
      {
        id: "approved-2",
        phrase: "content request up to 5 times",
        kind: "youtube_transcript_request",
        count: 5,
        rule: "up_to",
        createdAt: "2026-04-13T00:00:00.000Z",
      },
    ];

    const intent = parseTaskIntentFromText(
      "Please review the source. search up to 3 times. content request up to 5 times.",
      approved
    );

    expect(intent.workflow?.searchRequestCount).toBe(3);
    expect(intent.workflow?.searchRequestCountRule).toBe("up_to");
    expect(intent.workflow?.youtubeTranscriptRequestCount).toBe(5);
    expect(intent.workflow?.youtubeTranscriptRequestCountRule).toBe("up_to");
  });
});

describe("resolveTaskIntentWithFallback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends unmatched count wording to fallback and returns pending candidates", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        reply: JSON.stringify({
          suggestedTitle: "Transcript analysis task",
          candidates: [
            {
              phrase: "search up to 3 times",
              draftText: "CAN search request up to 3 times",
              kind: "search_request",
              count: 3,
              rule: "up_to",
              charLimit: null,
            },
            {
              phrase: "content request up to 5 times",
              draftText: "CAN content request up to 5 times",
              kind: "youtube_transcript_request",
              count: 5,
              rule: "up_to",
              charLimit: null,
            },
          ],
        }),
        usage: null,
      }),
    } as Response);

    const result = await resolveTaskIntentWithFallback({
      input:
        "Analyze the source material. search up to 3 times. content request up to 5 times.",
    });

    expect(result.usedFallback).toBe(true);
    expect(result.suggestedTitle).toBe("Transcript analysis task");
    expect(result.intent.workflow?.searchRequestCount).toBeUndefined();
    expect(result.intent.workflow?.youtubeTranscriptRequestCount).toBeUndefined();
    expect(result.pendingCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "search_request",
          phrase: "search up to 3 times",
          draftText: "CAN search request up to 3 times",
          count: 3,
          rule: "up_to",
        }),
        expect.objectContaining({
          kind: "youtube_transcript_request",
          phrase: "content request up to 5 times",
          draftText: "CAN content request up to 5 times",
          count: 5,
          rule: "up_to",
        }),
      ])
    );
  });

  it("keeps GPT request count pickup on the fallback path", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        reply: JSON.stringify({
          suggestedTitle: "farmers 360 strategy",
          candidates: [
            {
              phrase: "GPT request up to 3 times",
              draftText: "CAN ask GPT up to 3 times",
              kind: "ask_gpt",
              count: 3,
              rule: "up_to",
              charLimit: null,
            },
          ],
        }),
        usage: null,
      }),
    } as Response);

    const result = await resolveTaskIntentWithFallback({
      input:
        "Summarize the farmers 360 strategy in over 1000 characters. GPT request up to 3 times.",
    });

    expect(result.usedFallback).toBe(true);
    expect(result.pendingCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "ask_gpt",
          phrase: "GPT request up to 3 times",
          count: 3,
          rule: "up_to",
          draftText: "CAN ask GPT up to 3 times",
        }),
      ])
    );
  });

  it("skips fallback when a strong approved shortcut fully covers the directive wording", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await resolveTaskIntentWithFallback({
      input: "search up to 3 times",
      approvedPhrases: [
        {
          id: "approved-1",
          phrase: "search up to 3 times",
          kind: "search_request",
          count: 3,
          rule: "up_to",
          createdAt: "2026-04-13T00:00:00.000Z",
        },
      ],
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.usedFallback).toBe(false);
    expect(result.intent.workflow?.searchRequestCount).toBe(3);
    expect(result.pendingCandidates).toEqual([]);
  });

  it("still runs fallback when a weak or rejected approved fragment only partially matches", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        reply: JSON.stringify({
          suggestedTitle: "Search-assisted task",
          candidates: [
            {
              phrase: "search up to 3 times",
              draftText: "CAN search request up to 3 times",
              kind: "search_request",
              count: 3,
              rule: "up_to",
              charLimit: null,
            },
          ],
        }),
        usage: null,
      }),
    } as Response);

    const result = await resolveTaskIntentWithFallback({
      input: "Please proceed. search up to 3 times if needed.",
      approvedPhrases: [
        {
          id: "approved-weak-1",
          phrase: "search",
          kind: "search_request",
          count: 3,
          rule: "up_to",
          approvedCount: 0,
          rejectedCount: 2,
          createdAt: "2026-04-13T00:00:00.000Z",
        },
      ],
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(result.usedFallback).toBe(true);
    expect(result.pendingCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "search_request",
          count: 3,
          rule: "up_to",
        }),
      ])
    );
  });
});

describe("taskIntentFallback prompt", () => {
  it("describes semantic classification rules instead of phrase-specific answers", () => {
    const prompt = buildTaskIntentFallbackPrompt(
      CLEAN_INPUT,
      parseTaskIntentFromText(CLEAN_INPUT)
    );

    expect(prompt).toContain("Classify by meaning, not by surface similarity.");
    expect(prompt).toContain(
      "If a phrase limits asking GPT or requesting GPT help, classify it as ask_gpt."
    );
    expect(prompt).toContain(
      "If a phrase limits web search, online search, Google search, or external fact lookup, classify it as search_request."
    );
    expect(prompt).toContain("Never convert ask_gpt into search_request.");
    expect(prompt).toContain('ask_gpt -> "CAN ask GPT up to 3 times"');
  });

  it("parses candidate payloads from clean JSON replies", () => {
    expect(
      extractTaskIntentFallbackPayload(
        JSON.stringify({
          suggestedTitle: "Transcript analysis task",
          candidates: [
            {
              phrase: "content request up to 5 times",
              draftText: "CAN content request up to 5 times",
              kind: "youtube_transcript_request",
              count: 5,
              rule: "up_to",
              charLimit: null,
            },
            {
              phrase: "1000 characters or more",
              draftText:
                "MUST keep final output at least 1000 Japanese characters",
              kind: "char_limit",
              count: null,
              rule: "at_least",
              charLimit: 1000,
            },
          ],
        })
      )
    ).toEqual({
      suggestedTitle: "Transcript analysis task",
      candidates: [
        {
          phrase: "content request up to 5 times",
          draftText: "CAN content request up to 5 times",
          kind: "youtube_transcript_request",
          count: 5,
          rule: "up_to",
          charLimit: null,
        },
        {
          phrase: "1000 characters or more",
          draftText: "MUST keep final output at least 1000 Japanese characters",
          kind: "char_limit",
          count: null,
          rule: "at_least",
          charLimit: 1000,
        },
      ],
    });
  });
});

describe("parseIntentCandidateDraftText", () => {
  it("keeps no-less-than constraints as at_least instead of exact", () => {
    const fallback: PendingIntentCandidate = {
      id: "cand-1",
      phrase: "1000 characters or more",
      kind: "char_limit",
      charLimit: 1000,
      rule: "at_least",
      sourceText: "1000 characters or more",
      draftText: "MUST write report with no less than 1000 characters",
      createdAt: "2026-04-16T00:00:00.000Z",
    };

    expect(
      parseIntentCandidateDraftText(
        "MUST write report with no less than 1000 characters",
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

  it("keeps ask GPT edits as ask_gpt instead of search_request", () => {
    const fallback: PendingIntentCandidate = {
      id: "cand-2",
      phrase: "GPT request up to 3 times",
      kind: "ask_gpt",
      count: 3,
      rule: "up_to",
      sourceText: "GPT request up to 3 times",
      draftText: "CAN ask GPT up to 3 times",
      createdAt: "2026-04-17T00:00:00.000Z",
    };

    expect(
      parseIntentCandidateDraftText("CAN ask GPT up to 3 times", fallback)
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
  it("turns an editable pending candidate into an approved phrase shape", () => {
    const candidate: PendingIntentCandidate = {
      id: "cand-3",
      phrase: "GPT request up to 3 times",
      kind: "ask_gpt",
      count: 3,
      rule: "up_to",
      sourceText: "GPT request up to 3 times",
      draftText: "CAN ask GPT up to 3 times",
      approvedCount: 0,
      rejectedCount: 0,
      createdAt: "2026-04-17T00:00:00.000Z",
    };

    expect(normalizeApprovedIntentPhraseFromCandidate(candidate)).toEqual(
      expect.objectContaining({
        id: "cand-3",
        phrase: "GPT request up to 3 times",
        kind: "ask_gpt",
        count: 3,
        rule: "up_to",
        draftText: "CAN ask GPT up to 3 times",
      })
    );
  });
});
