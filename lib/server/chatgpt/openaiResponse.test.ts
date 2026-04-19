import { describe, expect, it } from "vitest";
import {
  extractJsonObjectText,
  extractResponseText,
  extractUsageDetails,
  extractUsage,
} from "@/lib/server/chatgpt/openaiResponse";
import {
  buildJsonObjectText,
  buildResponseText,
  buildUsageDetails,
  buildUsageSummary,
} from "@/lib/server/chatgpt/openaiResponseBuilders";

describe("openaiResponse helpers", () => {
  it("extracts usage counters with total fallback", () => {
    expect(
      extractUsage({
        usage: {
          input_tokens: 10,
          output_tokens: 5,
        },
      })
    ).toEqual({
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
    });
  });

  it("extracts json from fenced blocks", () => {
    const text = "```json\n{\"topic\":\"Tokyo\"}\n```";
    expect(extractJsonObjectText(text)).toBe('{"topic":"Tokyo"}');
  });

  it("extracts json by outer braces when not fenced", () => {
    const text = "prefix {\"goal\":\"Move\"} suffix";
    expect(extractJsonObjectText(text)).toBe('{"goal":"Move"}');
  });

  it("extracts response text from content tree or falls back", () => {
    const fromContent = extractResponseText({
      output: [{ content: [{ text: "hello" }] }],
    });
    const fromOutputText = extractResponseText({ output_text: "world" });
    const fallback = extractResponseText({}, "fallback text");

    expect(fromContent).toBe("hello");
    expect(fromOutputText).toBe("world");
    expect(fallback).toBe("fallback text");
  });

  it("builds response helpers through response builders", () => {
    expect(
      buildUsageSummary({
        usage: {
          input_tokens: 2,
          output_tokens: 3,
        },
      })
    ).toEqual({
      inputTokens: 2,
      outputTokens: 3,
      totalTokens: 5,
    });

    expect(buildJsonObjectText("```json\n{\"topic\":\"Tokyo\"}\n```")).toBe(
      '{"topic":"Tokyo"}'
    );

    expect(
      buildResponseText({
        output: [{ content: [{ text: "hello" }] }],
      })
    ).toBe("hello");
  });

  it("passes through raw usage details when present", () => {
    expect(
      extractUsageDetails({
        usage: {
          input_tokens: 2,
          output_tokens: 3,
          total_tokens: 5,
          output_tokens_details: {
            reasoning_tokens: 11,
          },
        },
      })
    ).toEqual({
      input_tokens: 2,
      output_tokens: 3,
      total_tokens: 5,
      output_tokens_details: {
        reasoning_tokens: 11,
      },
    });

    expect(
      buildUsageDetails({
        usage: {
          input_tokens: 1,
          output_tokens: 2,
          total_tokens: 3,
        },
      })
    ).toEqual({
      input_tokens: 1,
      output_tokens: 2,
      total_tokens: 3,
    });
  });
});
