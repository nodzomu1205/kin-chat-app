import { describe, expect, it } from "vitest";
import {
  resolvePrePreparationGateDecision,
  resolvePreparedRequestGateDecision,
  resolveSendToGptFlowStart,
} from "@/lib/app/send-to-gpt/sendToGptFlowDecisionState";

describe("sendToGptFlowDecisionState", () => {
  it("skips when input is blank or GPT is already loading", () => {
    expect(
      resolveSendToGptFlowStart({
        gptInput: "   ",
        gptLoading: false,
      })
    ).toEqual({ type: "skip" });

    expect(
      resolveSendToGptFlowStart({
        gptInput: "hello",
        gptLoading: true,
      })
    ).toEqual({ type: "skip" });
  });

  it("returns trimmed raw text when the flow should start", () => {
    expect(
      resolveSendToGptFlowStart({
        gptInput: "  hello  ",
        gptLoading: false,
      })
    ).toEqual({
      type: "run",
      rawText: "hello",
    });
  });

  it("prioritizes multipart import before inline url handling", () => {
    expect(
      resolvePrePreparationGateDecision({
        multipartHandled: true,
        inlineUrlTarget: "https://example.com",
      })
    ).toEqual({
      type: "multipart_import",
    });
  });

  it("uses inline url handling only when multipart import did not run", () => {
    expect(
      resolvePrePreparationGateDecision({
        multipartHandled: false,
        inlineUrlTarget: "https://example.com",
      })
    ).toEqual({
      type: "inline_url",
      inlineUrlTarget: "https://example.com",
    });
  });

  it("prioritizes task directive only over protocol violations and youtube requests", () => {
    expect(
      resolvePreparedRequestGateDecision({
        isTaskDirectiveOnly: true,
        limitViolation: "Too many requests.",
        youtubeTranscriptUrl: "https://youtube.com/watch?v=abc",
      })
    ).toEqual({
      type: "task_directive_only",
    });
  });

  it("prioritizes protocol limit violations before youtube transcript handling", () => {
    expect(
      resolvePreparedRequestGateDecision({
        isTaskDirectiveOnly: false,
        limitViolation: "Too many requests.",
        youtubeTranscriptUrl: "https://youtube.com/watch?v=abc",
      })
    ).toEqual({
      type: "protocol_limit_violation",
      violationText: "Too many requests.",
    });
  });

  it("falls back to youtube transcript handling when earlier gates do not apply", () => {
    expect(
      resolvePreparedRequestGateDecision({
        isTaskDirectiveOnly: false,
        limitViolation: null,
        youtubeTranscriptUrl: "https://youtube.com/watch?v=abc",
      })
    ).toEqual({
      type: "youtube_transcript",
    });
  });
});
