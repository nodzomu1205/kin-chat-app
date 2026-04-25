import { describe, expect, it } from "vitest";
import {
  buildYoutubeTranscriptAssistantMessage,
  buildYoutubeTranscriptDocumentRecord,
  buildYoutubeTranscriptFailureState,
  buildYoutubeTranscriptRequestBody,
  buildYoutubeTranscriptRequestBodyWithOptions,
  resolveYoutubeTranscriptFlowContext,
} from "@/lib/app/send-to-gpt/sendToGptYoutubeFlowBuilders";

describe("sendToGptYoutubeFlowBuilders", () => {
  it("resolves flow context", () => {
    expect(
      resolveYoutubeTranscriptFlowContext({
        transcriptUrl: "https://www.youtube.com/watch?v=abc123",
        taskId: "TASK-1",
        currentTaskId: null,
        actionId: "ACTION-1",
      })
    ).toEqual(
      expect.objectContaining({
        videoId: "abc123",
        outputMode: "summary_plus_raw",
        resolvedTaskId: "TASK-1",
        resolvedActionId: "ACTION-1",
      })
    );
  });

  it("builds request body and assistant message", () => {
    expect(buildYoutubeTranscriptRequestBody("abc123")).toEqual({
      videoId: "abc123",
    });
    expect(
      buildYoutubeTranscriptRequestBodyWithOptions({
        videoId: "abc123",
        generateSummary: false,
      })
    ).toEqual({
      videoId: "abc123",
      generateSummary: false,
    });
    expect(buildYoutubeTranscriptAssistantMessage("hello")).toEqual(
      expect.objectContaining({
        role: "gpt",
        text: "hello",
      })
    );
  });

  it("builds failure and document record state", () => {
    const failure = buildYoutubeTranscriptFailureState({
      taskId: "TASK-1",
      actionId: "ACTION-1",
      transcriptUrl: "https://www.youtube.com/watch?v=abc123",
      outputMode: "summary_plus_raw",
    });
    expect(failure.failureText).toContain("Transcript could not be fetched");
    expect(failure.retryBlock).toContain("<<SYS_GPT_RESPONSE>>");
    expect(failure.retryBlock).toContain("Failed URL:");

    const record = buildYoutubeTranscriptDocumentRecord({
      artifacts: {
        title: "Video",
        filename: "video.txt",
        cleanTranscript: "hello world",
        summary: "summary",
        kinBlocks: [],
        assistantText: "assistant",
      },
      taskId: "TASK-1",
      now: "2026-04-18T12:00:00Z",
    });
    expect(record.charCount).toBe(11);
  });
});
