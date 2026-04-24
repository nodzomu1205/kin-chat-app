import { describe, expect, it } from "vitest";
import {
  buildTranscriptCandidateLinks,
  buildYouTubeTranscriptSuccessResponse,
  resolveYouTubeTranscriptRequest,
} from "@/lib/server/youtubeTranscript/routeBuilders";

describe("youtubeTranscript routeBuilders", () => {
  it("resolves request fields safely", () => {
    expect(
      resolveYouTubeTranscriptRequest({
        videoId: " abc123 ",
        title: " Example ",
        channelName: " Channel ",
        duration: " 12:34 ",
      })
    ).toEqual({
      videoId: "abc123",
      title: "Example",
      channelName: "Channel",
      duration: "12:34",
    });
  });

  it("prioritizes and deduplicates transcript candidate links", () => {
    expect(
      buildTranscriptCandidateLinks({
        available_transcripts: [
          { serpapi_link: "b", type: "asr" },
          { serpapi_link: "a", selected: true },
          { serpapi_link: "b", type: "asr" },
          { serpapi_link: "c" },
        ],
      })
    ).toEqual(["a", "b", "c"]);
  });

  it("builds the transcript success payload", () => {
    expect(
      buildYouTubeTranscriptSuccessResponse({
        videoId: "abc123",
        title: "Example Video",
        channelName: "Example Channel",
        duration: "12:34",
        raw: { transcript: [] },
        transcript: [{ start: "0:01", text: "first line" }],
      })
    ).toEqual(
      expect.objectContaining({
        title: "Example Video [Transcript]",
        filename: "Example Video-abc123.txt",
        text: "[0:01] first line",
      })
    );
  });

  it("prefers a shared generated summary when provided", () => {
    expect(
      buildYouTubeTranscriptSuccessResponse({
        videoId: "abc123",
        title: "Example Video",
        raw: { transcript: [] },
        transcript: [{ start: "0:01", text: "first line" }],
        summary: "Shared summary",
      }).summary
    ).toBe("Shared summary");
  });
});
