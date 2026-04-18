import { describe, expect, it } from "vitest";
import {
  buildInlineUrlGateContext,
  buildMultipartImportGateContext,
  buildProtocolLimitViolationGateContext,
  buildTaskDirectiveOnlyGateContext,
  buildYoutubeTranscriptGateContext,
} from "@/lib/app/sendToGptFlowGuards";

describe("sendToGptFlow guard builders", () => {
  it("builds the task-directive gate context from the prepared request", () => {
    const result = buildTaskDirectiveOnlyGateContext({
      preparedRequest: {
        parsedInput: { title: "Task" },
        effectiveParsedSearchQuery: "",
        limitViolation: null,
        userMsg: { id: "u1", role: "user", text: "Task" },
      },
      shouldRespondToTaskDirectiveOnlyInput: () => true,
    });

    expect(result).toEqual({
      isTaskDirectiveOnly: true,
    });
  });

  it("builds the multipart-import gate context", () => {
    expect(
      buildMultipartImportGateContext({
        rawText: "multipart body",
        processMultipartTaskDoneText: () => ({ handled: true, accepted: true }),
      })
    ).toEqual({
      multipartHandled: true,
    });
  });

  it("builds the inline-url gate context", () => {
    expect(
      buildInlineUrlGateContext({
        rawText: "https://example.com",
        extractInlineUrlTarget: () => "https://example.com",
      })
    ).toEqual({
      inlineUrlTarget: "https://example.com",
    });
  });

  it("builds the protocol-limit gate context from the prepared request", () => {
    const result = buildProtocolLimitViolationGateContext({
      preparedRequest: {
        parsedInput: {},
        effectiveParsedSearchQuery: "",
        limitViolation: "limit hit",
        userMsg: { id: "u1", role: "user", text: "hello" },
      },
    });

    expect(result).toEqual({
      limitViolation: "limit hit",
      userMsg: { id: "u1", role: "user", text: "hello" },
    });
  });

  it("builds the youtube-transcript gate context from the prepared request", () => {
    const result = buildYoutubeTranscriptGateContext({
      preparedRequest: {
        parsedInput: {},
        effectiveParsedSearchQuery: "",
        limitViolation: null,
        userMsg: { id: "u1", role: "user", text: "hello" },
        youtubeTranscriptRequestEvent: {
          type: "youtube_transcript_request",
          body: "Fetch transcript",
          url: "https://youtube.com/watch?v=1",
        },
      },
    });

    expect(result).toEqual({
      userMsg: { id: "u1", role: "user", text: "hello" },
      youtubeTranscriptRequestEvent: {
        type: "youtube_transcript_request",
        body: "Fetch transcript",
        url: "https://youtube.com/watch?v=1",
      },
    });
  });
});
