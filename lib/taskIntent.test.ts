import { describe, expect, it } from "vitest";
import {
  parseTaskIntentFromText,
  type ApprovedIntentPhrase,
} from "@/lib/taskIntent";

describe("parseTaskIntentFromText", () => {
  it("extracts search and youtube transcript counts from Japanese task text", () => {
    const intent = parseTaskIntentFromText(
      "人気の女性YouTuberを調べて。検索3回迄、文字起こし送付5回。"
    );

    expect(intent.workflow?.allowSearchRequest).toBe(true);
    expect(intent.workflow?.searchRequestCount).toBe(3);
    expect(intent.workflow?.searchRequestCountRule).toBe("up_to");

    expect(intent.workflow?.allowYoutubeTranscriptRequest).toBe(true);
    expect(intent.workflow?.youtubeTranscriptRequestCount).toBe(5);
    expect(intent.workflow?.youtubeTranscriptRequestCountRule).toBe("exact");
  });

  it("extracts Japanese character constraints", () => {
    const intent = parseTaskIntentFromText(
      "サマリーを1000文字以上で送ってください。"
    );

    expect(intent.constraints).toContain(
      "Keep the final output at or above 1000 Japanese characters if feasible."
    );
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
        phrase: "文字起こし送付5回",
        kind: "youtube_transcript_request",
        count: 5,
        rule: "exact",
        createdAt: "2026-04-13T00:00:00.000Z",
      },
    ];

    const intent = parseTaskIntentFromText(
      "この動画群をまとめて。検索3回迄、文字起こし送付5回。",
      approved
    );

    expect(intent.workflow?.searchRequestCount).toBe(3);
    expect(intent.workflow?.searchRequestCountRule).toBe("up_to");
    expect(intent.workflow?.youtubeTranscriptRequestCount).toBe(5);
    expect(intent.workflow?.youtubeTranscriptRequestCountRule).toBe("exact");
  });

  it("does not invent search workflow when no search wording exists", () => {
    const intent = parseTaskIntentFromText(
      "丁寧な返信文を作ってください。"
    );

    expect(intent.workflow?.allowSearchRequest).toBe(false);
    expect(intent.workflow?.searchRequestCount).toBeUndefined();
  });
});
