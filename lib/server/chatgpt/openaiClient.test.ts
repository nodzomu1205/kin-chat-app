import { describe, expect, it } from "vitest";
import {
  buildOpenAIResponsesRequestBody,
  buildOpenAIResponsesResult,
} from "@/lib/server/chatgpt/openaiClientBuilders";

describe("openaiClient builders", () => {
  it("builds the responses request body with fallback model", () => {
    expect(
      buildOpenAIResponsesRequestBody(
        {
          input: "hello",
        },
        "gpt-4o-mini"
      )
    ).toEqual({
      model: "gpt-4o-mini",
      input: "hello",
    });
  });

  it("builds the responses result from OpenAI data", () => {
    expect(
      buildOpenAIResponsesResult({
        data: {
          output_text: "hello",
          usage: {
            input_tokens: 2,
            output_tokens: 3,
            total_tokens: 5,
          },
        },
        fallbackText: "fallback",
      })
    ).toEqual({
      data: {
        output_text: "hello",
        usage: {
          input_tokens: 2,
          output_tokens: 3,
          total_tokens: 5,
        },
      },
      text: "hello",
      usage: {
        inputTokens: 2,
        outputTokens: 3,
        totalTokens: 5,
      },
      usageDetails: {
        input_tokens: 2,
        output_tokens: 3,
        total_tokens: 5,
      },
    });
  });
});
