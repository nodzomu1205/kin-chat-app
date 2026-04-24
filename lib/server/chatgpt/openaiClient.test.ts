import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildOpenAIResponsesRequestBody,
  buildOpenAIResponsesResult,
} from "@/lib/server/chatgpt/openaiClientBuilders";
import { callOpenAIResponses } from "@/lib/server/chatgpt/openaiClient";

const originalOpenAiApiKey = process.env.OPENAI_API_KEY;

afterEach(() => {
  process.env.OPENAI_API_KEY = originalOpenAiApiKey;
  vi.restoreAllMocks();
});

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

  it("throws when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;

    await expect(callOpenAIResponses({ input: "hello" })).rejects.toThrow(
      "OPENAI_API_KEY is not set."
    );
  });

  it("throws the OpenAI error message when the API returns a non-ok response", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: vi.fn().mockResolvedValue(
          JSON.stringify({
            error: {
              message: "Incorrect API key provided.",
              code: "invalid_api_key",
            },
          })
        ),
      })
    );

    await expect(callOpenAIResponses({ input: "hello" })).rejects.toThrow(
      "Incorrect API key provided. (invalid_api_key)"
    );
  });
});
