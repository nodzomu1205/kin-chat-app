import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildApprovedIntentPhraseMatchScore,
  findBestApprovedIntentPhraseMatchWithScore,
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

describe("parseTaskIntentFromText", () => {
  it("keeps count-based workflow empty until phrases are approved", () => {
    const intent = parseTaskIntentFromText(
      "縄文時代に関する動画をYouTubeで最低3つ見つけて分析してレポートを提出して。1000文字以上。検索3回迄。コンテンツ取得5回迄。"
    );

    expect(intent.workflow?.allowSearchRequest).toBe(true);
    expect(intent.workflow?.searchRequestCount).toBeUndefined();
    expect(intent.workflow?.youtubeTranscriptRequestCount).toBeUndefined();
  });

  it("applies approved intent phrases when matching text includes the phrase", () => {
    const approved: ApprovedIntentPhrase[] = [
      {
        id: "approved-1",
        phrase: "検索3回迄",
        kind: "search_request",
        count: 3,
        rule: "up_to",
        createdAt: "2026-04-13T00:00:00.000Z",
      },
      {
        id: "approved-2",
        phrase: "コンテンツ取得5回迄",
        kind: "youtube_transcript_request",
        count: 5,
        rule: "up_to",
        createdAt: "2026-04-13T00:00:00.000Z",
      },
    ];

    const intent = parseTaskIntentFromText(
      "縄文時代について調べてください。検索3回迄。コンテンツ取得5回迄。",
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
          suggestedTitle: "縄文時代YouTube動画分析",
          candidates: [
            {
              phrase: "検索3回迄",
              draftText: "CAN search request up to 3 times",
              kind: "search_request",
              count: 3,
              rule: "up_to",
              charLimit: null,
            },
            {
              phrase: "コンテンツ取得5回迄",
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
        "縄文時代に関する動画をYouTubeで最低3つ見つけて分析してレポートを提出して。1000文字以上。検索3回迄。コンテンツ取得5回迄。",
    });

    expect(result.usedFallback).toBe(true);
    expect(result.suggestedTitle).toBe("縄文時代YouTube動画分析");
    expect(result.intent.workflow?.searchRequestCount).toBeUndefined();
    expect(result.intent.workflow?.youtubeTranscriptRequestCount).toBeUndefined();
    expect(result.pendingCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "search_request",
          phrase: "検索3回迄",
          draftText: "CAN search request up to 3 times",
          count: 3,
          rule: "up_to",
        }),
        expect.objectContaining({
          kind: "youtube_transcript_request",
          phrase: "コンテンツ取得5回迄",
          draftText: "CAN content request up to 5 times",
          count: 5,
          rule: "up_to",
        }),
      ])
    );
  });

  it("skips fallback when a strong approved shortcut fully covers the directive wording", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await resolveTaskIntentWithFallback({
      input: "検索3回迄",
      approvedPhrases: [
        {
          id: "approved-1",
          phrase: "検索3回迄",
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
});

describe("taskIntentFallback prompt", () => {
  it("contains clean guidance for transcript and character constraints", () => {
    const prompt = buildTaskIntentFallbackPrompt(
      "縄文時代に関する動画をYouTubeで最低3つ見つけて分析してレポートを提出して。1000文字以上。検索3回迄。コンテンツ取得5回迄。",
      parseTaskIntentFromText("縄文時代に関する動画をYouTubeで最低3つ見つけて分析してレポートを提出して。1000文字以上。検索3回迄。コンテンツ取得5回迄。")
    );

    expect(prompt).toContain('If USER_TEXT contains "コンテンツ取得5回迄"');
    expect(prompt).toContain('If USER_TEXT contains "1000文字以上"');
    expect(prompt).toContain('"kind": "youtube_transcript_request"');
    expect(prompt).toContain('"rule": "at_least"');
  });

  it("parses candidate payloads from clean JSON replies", () => {
    expect(
      extractTaskIntentFallbackPayload(
        JSON.stringify({
          suggestedTitle: "縄文時代に関する動画分析",
          candidates: [
            {
              phrase: "コンテンツ取得5回迄",
              draftText: "CAN content request up to 5 times",
              kind: "youtube_transcript_request",
              count: 5,
              rule: "up_to",
              charLimit: null,
            },
            {
              phrase: "1000文字以上",
              draftText: "MUST keep final output at least 1000 Japanese characters",
              kind: "char_limit",
              count: null,
              rule: "at_least",
              charLimit: 1000,
            },
          ],
        })
      )
    ).toEqual({
      suggestedTitle: "縄文時代に関する動画分析",
      candidates: [
        {
          phrase: "コンテンツ取得5回迄",
          draftText: "CAN content request up to 5 times",
          kind: "youtube_transcript_request",
          count: 5,
          rule: "up_to",
          charLimit: null,
        },
        {
          phrase: "1000文字以上",
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
      phrase: "1000文字以上",
      kind: "char_limit",
      charLimit: 1000,
      rule: "at_least",
      sourceText: "1000文字以上",
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
});

describe("approved intent shortcuts", () => {
  it("treats highly approved exact matches as strong shortcuts", () => {
    const phrase: ApprovedIntentPhrase = {
      id: "approved-1",
      phrase: "検索3回迄",
      kind: "search_request",
      count: 3,
      rule: "up_to",
      approvedCount: 3,
      rejectedCount: 0,
      createdAt: "2026-04-13T00:00:00.000Z",
    };

    expect(buildApprovedIntentPhraseMatchScore("検索3回迄", phrase)).toBeGreaterThanOrEqual(6);
    expect(
      findBestApprovedIntentPhraseMatchWithScore("検索3回迄", [phrase]).phrase?.id
    ).toBe("approved-1");
  });

  it("keeps weak or rejected matches below the shortcut threshold", () => {
    const phrase: ApprovedIntentPhrase = {
      id: "approved-2",
      phrase: "検索",
      kind: "search_request",
      count: 3,
      rule: "up_to",
      approvedCount: 0,
      rejectedCount: 2,
      createdAt: "2026-04-13T00:00:00.000Z",
    };

    expect(buildApprovedIntentPhraseMatchScore("検索3回迄", phrase)).toBeLessThan(6);
  });
});
