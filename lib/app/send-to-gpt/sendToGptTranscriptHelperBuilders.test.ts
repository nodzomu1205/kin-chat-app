import { describe, expect, it } from "vitest";
import {
  buildTranscriptFailureArtifacts,
  buildTranscriptSuccessArtifacts,
  extractYouTubeVideoIdFromUrl,
} from "@/lib/app/send-to-gpt/sendToGptTranscriptHelperBuilders";

describe("sendToGptTranscriptHelperBuilders", () => {
  it("extracts youtube ids from known URL formats", () => {
    expect(
      extractYouTubeVideoIdFromUrl("https://www.youtube.com/watch?v=abc123XYZ")
    ).toBe("abc123XYZ");
    expect(extractYouTubeVideoIdFromUrl("https://youtu.be/abc123XYZ")).toBe(
      "abc123XYZ"
    );
  });

  it("builds transcript success artifacts", () => {
    const result = buildTranscriptSuccessArtifacts({
      data: {
        title: "Test Video",
        text: "00:00 hello world",
      },
      videoId: "abc123XYZ",
      transcriptUrl: "https://www.youtube.com/watch?v=abc123XYZ",
      outputMode: "summary_plus_raw",
      taskId: "123456",
      actionId: "Y001",
      storedDocumentId: "doc001",
    });

    expect(result.title).toBe("Test Video");
    expect(result.assistantText).toContain("<<SYS_YOUTUBE_TRANSCRIPT_RESPONSE>>");
  });

  it("builds transcript failure artifacts", () => {
    expect(
      buildTranscriptFailureArtifacts({
        taskId: "123456",
        actionId: "Y001",
        transcriptUrl: "https://www.youtube.com/watch?v=abc123XYZ",
        outputMode: "summary_plus_raw",
      })
    ).toContain("Transcript could not be fetched");
  });
});
