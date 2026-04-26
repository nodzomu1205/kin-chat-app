import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApprovedIntentPhrase } from "@/lib/task/taskIntent";
import type { PendingIntentCandidate } from "@/lib/task/taskIntentPhraseState";
import {
  parseTaskIntentFromText,
  resolveTaskIntentWithFallback,
} from "@/lib/task/taskIntent";
import {
  formatIntentCandidateDraftText,
  normalizeApprovedIntentPhraseFromCandidate,
  parseIntentCandidateDraftText,
} from "@/lib/task/taskIntentPhraseState";
import {
  buildTaskIntentFallbackPrompt,
  extractTaskIntentFallbackPayload,
} from "@/lib/task/taskIntentFallback";

const CLEAN_INPUT =
  "Analyze the YouTube transcript and use Google search to prepare an analysis.";

describe("parseTaskIntentFromText", () => {
  it("keeps workflow permissions and counts empty until phrases are approved", () => {
    const intent = parseTaskIntentFromText(CLEAN_INPUT);

    expect(intent.output).toEqual(
      expect.objectContaining({
        type: "essay",
        language: "ja",
        length: "medium",
      })
    );
    expect(intent.workflow?.allowSearchRequest).toBeUndefined();
    expect(intent.workflow?.allowYoutubeTranscriptRequest).toBeUndefined();
    expect(intent.workflow?.finalizationPolicy).toBeUndefined();
    expect(intent.workflow?.searchRequestCount).toBeUndefined();
    expect(intent.workflow?.youtubeTranscriptRequestCount).toBeUndefined();
  });

  it("applies approved constraint lines when matching text includes the phrase", () => {
    const approved: ApprovedIntentPhrase[] = [
      {
        id: "approved-search",
        phrase: "search up to 3 times",
        kind: "search_request",
        count: 3,
        rule: "up_to",
        draftText: "Perform up to 3 searches.",
        createdAt: "2026-04-19T00:00:00.000Z",
      },
      {
        id: "approved-gpt",
        phrase: "GPT request up to 2 times",
        kind: "ask_gpt",
        count: 2,
        rule: "up_to",
        draftText: "Make up to 2 requests to GPT.",
        createdAt: "2026-04-19T00:00:00.000Z",
      },
    ];

    const intent = parseTaskIntentFromText(
      "Please proceed. search up to 3 times. GPT request up to 2 times.",
      approved
    );

    expect(intent.constraints).toEqual([
      "Perform up to 3 searches.",
      "Make up to 2 requests to GPT.",
    ]);
    expect(intent.workflow?.allowSearchRequest).toBe(true);
    expect(intent.workflow?.searchRequestCount).toBe(3);
    expect(intent.workflow?.askGptCount).toBe(2);
  });

  it("applies approved Japanese constraint lines through the same constraint path", () => {
    const approved: ApprovedIntentPhrase[] = [
      {
        id: "approved-search-ja",
        phrase: "検索を3回まで",
        kind: "search_request",
        count: 3,
        rule: "up_to",
        draftText: "Perform up to 3 searches.",
        createdAt: "2026-04-19T00:00:00.000Z",
      },
      {
        id: "approved-user-ja",
        phrase: "ユーザーに1回確認",
        kind: "ask_user",
        count: 1,
        rule: "exact",
        draftText: "Ask exactly 1 question to the user.",
        createdAt: "2026-04-19T00:00:00.000Z",
      },
    ];

    const intent = parseTaskIntentFromText(
      "この件は検索を3回まで。必要ならユーザーに1回確認してください。",
      approved
    );

    expect(intent.constraints).toEqual([
      "Perform up to 3 searches.",
      "Ask exactly 1 question to the user.",
    ]);
    expect(intent.workflow?.allowSearchRequest).toBe(true);
    expect(intent.workflow?.searchRequestCount).toBe(3);
    expect(intent.workflow?.askUserCount).toBe(1);
  });
});

describe("resolveTaskIntentWithFallback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns pending candidates inferred from fixed slots", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        reply: JSON.stringify({
          output_limit: {
            matched: true,
            phrase: "1000文字以内",
            charLimit: 1000,
            rule: "up_to",
          },
          gpt_request: {
            matched: true,
            phrase: "GPTへのリクエスト3回迄",
            count: 3,
            rule: "up_to",
          },
          search_request: {
            matched: true,
            phrase: "検索2回迄",
            count: 2,
            rule: "up_to",
          },
          youtube_transcript_request: {
            matched: false,
            phrase: "",
            count: null,
            rule: null,
          },
          library_index_request: {
            matched: false,
            phrase: "",
            count: null,
            rule: null,
          },
          library_item_request: {
            matched: false,
            phrase: "",
            count: null,
            rule: null,
          },
          ask_user: {
            matched: false,
            phrase: "",
            count: null,
            rule: null,
          },
        }),
        usage: null,
      }),
    } as Response);

    const result = await resolveTaskIntentWithFallback({
      input:
        "farmers 360° link再起案を1000文字以内で纏めて下さい。GPTへのリクエスト3回迄、検索2回迄。",
    });

    expect(result.usedFallback).toBe(true);
    expect(result.pendingCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          phrase: "1000文字以内",
          kind: "char_limit",
          charLimit: 1000,
          rule: "up_to",
          draftText: "Please summarize in up to 1000 characters.",
        }),
        expect.objectContaining({
          phrase: "GPTへのリクエスト3回迄",
          kind: "ask_gpt",
          count: 3,
          rule: "up_to",
          draftText: "Make up to 3 requests to GPT.",
        }),
        expect.objectContaining({
          phrase: "検索2回迄",
          kind: "search_request",
          count: 2,
          rule: "up_to",
          draftText: "Perform up to 2 searches.",
        }),
      ])
    );
  });

  it("skips fallback when a strong approved phrase fully covers the directive wording", async () => {
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
          draftText: "Perform up to 3 searches.",
          createdAt: "2026-04-19T00:00:00.000Z",
        },
      ],
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.usedFallback).toBe(false);
    expect(result.intent.workflow?.searchRequestCount).toBe(3);
    expect(result.pendingCandidates).toEqual([]);
  });

  it("still runs fallback when unmatched wording remains after a strong approved phrase", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        reply: JSON.stringify({
          output_limit: {
            matched: false,
            phrase: "",
            charLimit: null,
            rule: null,
          },
          gpt_request: {
            matched: true,
            phrase: "GPT request up to 2 times",
            count: 2,
            rule: "up_to",
          },
          search_request: {
            matched: false,
            phrase: "",
            count: null,
            rule: null,
          },
          youtube_transcript_request: {
            matched: false,
            phrase: "",
            count: null,
            rule: null,
          },
          library_index_request: {
            matched: false,
            phrase: "",
            count: null,
            rule: null,
          },
          library_item_request: {
            matched: false,
            phrase: "",
            count: null,
            rule: null,
          },
          ask_user: {
            matched: false,
            phrase: "",
            count: null,
            rule: null,
          },
        }),
        usage: null,
      }),
    } as Response);

    const result = await resolveTaskIntentWithFallback({
      input: "search up to 3 times and GPT request up to 2 times",
      approvedPhrases: [
        {
          id: "approved-1",
          phrase: "search up to 3 times",
          kind: "search_request",
          count: 3,
          rule: "up_to",
          draftText: "Perform up to 3 searches.",
          createdAt: "2026-04-19T00:00:00.000Z",
        },
      ],
    });

    expect(fetchSpy).toHaveBeenCalled();
    expect(result.usedFallback).toBe(true);
    expect(result.pendingCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "ask_gpt",
          count: 2,
          rule: "up_to",
        }),
      ])
    );
  });

  it("drops fallback candidates that are already approved by constraint signature", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        reply: JSON.stringify({
          output_limit: {
            matched: false,
            phrase: "",
            charLimit: null,
            rule: null,
          },
          gpt_request: {
            matched: false,
            phrase: "",
            count: null,
            rule: null,
          },
          search_request: {
            matched: true,
            phrase: "search the web at most 3 times",
            count: 3,
            rule: "up_to",
          },
          youtube_transcript_request: {
            matched: false,
            phrase: "",
            count: null,
            rule: null,
          },
          library_index_request: {
            matched: false,
            phrase: "",
            count: null,
            rule: null,
          },
          library_item_request: {
            matched: false,
            phrase: "",
            count: null,
            rule: null,
          },
          ask_user: {
            matched: false,
            phrase: "",
            count: null,
            rule: null,
          },
        }),
        usage: null,
      }),
    } as Response);

    const result = await resolveTaskIntentWithFallback({
      input: "search up to 3 times and keep going",
      approvedPhrases: [
        {
          id: "approved-1",
          phrase: "search up to 3 times",
          kind: "search_request",
          count: 3,
          rule: "up_to",
          draftText: "Perform up to 3 searches.",
          createdAt: "2026-04-19T00:00:00.000Z",
        },
      ],
    });

    expect(result.pendingCandidates).toEqual([]);
  });
});

describe("taskIntentFallback prompt", () => {
  it("uses the fixed-slot schema", () => {
    const prompt = buildTaskIntentFallbackPrompt(
      CLEAN_INPUT,
      parseTaskIntentFromText(CLEAN_INPUT)
    );

    expect(prompt).toContain('"output_limit": {');
    expect(prompt).toContain('"gpt_request": {');
    expect(prompt).toContain('"search_request": {');
    expect(prompt).toContain('"youtube_transcript_request": {');
    expect(prompt).toContain('"library_index_request": {');
    expect(prompt).toContain('"library_item_request": {');
    expect(prompt).toContain('"ask_user": {');
    expect(prompt).toContain("- Always return every slot above.");
    expect(prompt).toContain(
      "- Set matched=true only when USER_TEXT explicitly contains that requirement."
    );
    expect(prompt).toContain(
      "- Write phrase as a snippet around the number including the subject, but not necessarily the whole sentence."
    );
    expect(prompt).not.toContain("Use output_limit");
    expect(prompt).not.toContain("Use gpt_request");
  });

  it("parses fixed-slot payloads from JSON replies", () => {
    expect(
      extractTaskIntentFallbackPayload(
        JSON.stringify({
          output_limit: {
            matched: true,
            phrase: "1000文字以内",
            charLimit: 1000,
            rule: "up_to",
          },
          gpt_request: {
            matched: true,
            phrase: "GPTへのリクエスト3回迄",
            count: 3,
            rule: "up_to",
          },
          search_request: {
            matched: false,
            phrase: "",
            count: null,
            rule: null,
          },
          youtube_transcript_request: {
            matched: false,
            phrase: "",
            count: null,
            rule: null,
          },
          library_index_request: {
            matched: false,
            phrase: "",
            count: null,
            rule: null,
          },
          library_item_request: {
            matched: false,
            phrase: "",
            count: null,
            rule: null,
          },
          ask_user: {
            matched: false,
            phrase: "",
            count: null,
            rule: null,
          },
        })
      )
    ).toEqual({
      candidates: [
        {
          kind: "output_limit",
          phrase: "1000文字以内",
          charLimit: 1000,
          rule: "up_to",
        },
        {
          kind: "gpt_request",
          phrase: "GPTへのリクエスト3回迄",
          count: 3,
          rule: "up_to",
        },
      ],
    });
  });
});

describe("parseIntentCandidateDraftText", () => {
  it("still parses edited char_limit sentences", () => {
    const fallback: PendingIntentCandidate = {
      id: "cand-char",
      phrase: "1000文字以内",
      kind: "char_limit",
      sourceText: "1000文字以内",
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
      phrase: "GPTへのリクエスト3回迄",
      kind: "ask_gpt",
      sourceText: "GPTへのリクエスト3回迄",
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
      phrase: "検索2回迄",
      kind: "search_request",
      count: 2,
      rule: "up_to",
      sourceText: "検索2回迄",
      draftText: "Limit the searches to a maximum of 2 times.",
      approvedCount: 0,
      rejectedCount: 0,
      createdAt: "2026-04-19T00:00:00.000Z",
    };

    expect(normalizeApprovedIntentPhraseFromCandidate(candidate)).toEqual(
      expect.objectContaining({
        id: "cand-approved",
        phrase: "検索2回迄",
        kind: "search_request",
        count: 2,
        rule: "up_to",
        draftText: "Limit the searches to a maximum of 2 times.",
      })
    );
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
    ).toBe("Request up to 1 library data response.");

    expect(
      formatIntentCandidateDraftText({
        kind: "library_item_request",
        count: 2,
        rule: "at_least",
      })
    ).toBe("Request at least 2 library data responses.");

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
