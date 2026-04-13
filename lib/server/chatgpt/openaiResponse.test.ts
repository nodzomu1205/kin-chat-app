import { describe, expect, it } from "vitest";
import {
  extractJsonObjectText,
  extractResponseText,
  extractUsage,
} from "@/lib/server/chatgpt/openaiResponse";

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
});
