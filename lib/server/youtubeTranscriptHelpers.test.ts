import { describe, expect, it } from "vitest";
import {
  buildCleanTranscriptText,
  buildTranscriptSummary,
  sanitizeTranscriptFilename,
  toTranscriptText,
} from "@/lib/server/youtubeTranscriptHelpers";

describe("youtubeTranscriptHelpers", () => {
  it("formats transcript rows with timestamps when present", () => {
    const transcript = [
      { start: "0:01", text: "first line" },
      { start_time_text: "0:04", snippet: "second line" },
    ];

    expect(toTranscriptText(transcript)).toBe(
      "[0:01] first line\n[0:04] second line"
    );
  });

  it("builds clean transcript text without timestamps and repairs line noise", () => {
    const transcript = [
      { start: "0:01", text: "ロシア帝国、ソ連、そして現代のロシアは 一貫して" },
      { start: "0:04", text: "国家予算の多くを国防費に費やし" },
      { start: "0:06", text: "てきた軍事大国です。[音楽]" },
    ];

    expect(buildCleanTranscriptText(transcript)).toContain(
      "国家予算の多くを国防費に費やしてきた軍事大国です。"
    );
    expect(buildCleanTranscriptText(transcript)).not.toContain("[音楽]");
  });

  it("builds a short summary with title and transcript preview", () => {
    const summary = buildTranscriptSummary({
      title: "Example Video",
      channelName: "Example Channel",
      duration: "12:34",
      transcriptText: "最初の文です。次の文です。三つ目の文です。",
    });

    expect(summary).toContain("YouTube transcript for Example Video");
    expect(summary).toContain("最初の文です。 次の文です。");
  });

  it("sanitizes filenames while preserving readable text", () => {
    expect(sanitizeTranscriptFilename("Tokyo / South Africa?", "abc123")).toBe(
      "Tokyo South Africa-abc123.txt"
    );
  });
});
