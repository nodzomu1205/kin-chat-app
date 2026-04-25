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
      { start: "0:01", text: "ロシア語、そうして世界のロシアは 一旦消して" },
      { start: "0:04", text: "別の文章を長く続けます" },
      { start: "0:06", text: "[音楽]" },
    ];

    expect(buildCleanTranscriptText(transcript)).toContain(
      "別の文章を長く続けます"
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
    expect(summary).not.toContain("三つ目の文です。");
  });

  it("keeps transcript summaries short even when sentence splitting fails", () => {
    const summary = buildTranscriptSummary({
      title: "Long Video",
      transcriptText: `[0:01] ${"a".repeat(260)}`,
    });

    expect(summary).toContain("YouTube transcript for Long Video.");
    expect(summary.endsWith("...")).toBe(true);
  });

  it("sanitizes filenames while preserving readable text", () => {
    expect(sanitizeTranscriptFilename("Tokyo / South Africa?")).toBe(
      "Tokyo South Africa.txt"
    );
  });
});
