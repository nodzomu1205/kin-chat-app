import { describe, expect, it } from "vitest";
import {
  buildYoutubeTranscriptFailureText,
  buildYoutubeTranscriptSuccessArtifacts,
  extractYouTubeVideoIdFromUrl,
} from "@/lib/app/sendToGptTranscriptHelpers";

describe("sendToGptTranscriptHelpers", () => {
  it("extracts a video id from youtube watch urls", () => {
    expect(
      extractYouTubeVideoIdFromUrl("https://www.youtube.com/watch?v=abc123XYZ")
    ).toBe("abc123XYZ");
  });

  it("extracts a video id from youtu.be urls", () => {
    expect(extractYouTubeVideoIdFromUrl("https://youtu.be/abc123XYZ")).toBe(
      "abc123XYZ"
    );
  });

  it("returns empty string for invalid urls", () => {
    expect(extractYouTubeVideoIdFromUrl("not-a-url")).toBe("");
  });

  it("builds transcript success artifacts with cleaned text and blocks", () => {
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
