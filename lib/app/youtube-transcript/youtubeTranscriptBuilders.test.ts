import { describe, expect, it } from "vitest";
import {
  buildYouTubeTranscriptExcerpt,
  buildYouTubeTranscriptKinBlocks,
  buildYoutubeTranscriptFailureText,
  buildYoutubeTranscriptSuccessArtifacts,
  cleanYouTubeTranscriptText,
} from "@/lib/app/youtube-transcript/youtubeTranscriptBuilders";

describe("youtubeTranscriptBuilders", () => {
  it("cleans transcript text and builds excerpts", () => {
    const cleaned = cleanYouTubeTranscriptText("00:00 hello world\nnext line");
    expect(cleaned).toContain("hello world");
    expect(buildYouTubeTranscriptExcerpt(cleaned, 5)).toBe("hello...");
  });

  it("builds kin blocks from a transcript", () => {
    const blocks = buildYouTubeTranscriptKinBlocks({
      cleanTranscript: "hello world",
      title: "Video",
      url: "https://youtu.be/abc123",
    });

    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks[0]).toContain("YouTube Script");
  });

  it("builds transcript success artifacts", () => {
    const result = buildYoutubeTranscriptSuccessArtifacts({
      data: {
        title: "Test Video",
        text: "00:00 intro\nhello world",
      },
      videoId: "abc123XYZ",
      transcriptUrl: "https://www.youtube.com/watch?v=abc123XYZ",
      outputMode: "summary_plus_raw",
      taskId: "123456",
      actionId: "Y001",
      storedDocumentId: "doc001",
    });

    expect(result.title).toBe("Test Video");
    expect(result.cleanTranscript).toContain("hello world");
    expect(result.kinBlocks.length).toBeGreaterThan(0);
    expect(result.assistantText).toContain("<<SYS_YOUTUBE_TRANSCRIPT_RESPONSE>>");
  });

  it("builds a transcript failure response block", () => {
    const result = buildYoutubeTranscriptFailureText({
      taskId: "123456",
      actionId: "Y001",
      transcriptUrl: "https://www.youtube.com/watch?v=abc123XYZ",
      outputMode: "summary_plus_raw",
    });

    expect(result).toContain("<<SYS_YOUTUBE_TRANSCRIPT_RESPONSE>>");
    expect(result).toContain("Transcript could not be fetched");
  });
});
