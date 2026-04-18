import { describe, expect, it } from "vitest";
import {
  buildIngestOpenAIErrorResponse,
  buildIngestParseFailureResponse,
  buildIngestSuccessResponse,
  buildOpenAIIngestRequestBody,
  buildTextIngestShortcutResponse,
} from "@/lib/server/ingest/routeBuilders";

describe("ingest route builders", () => {
  it("builds the OpenAI ingest request body", () => {
    expect(
      buildOpenAIIngestRequestBody({
        model: "gpt-4.1-mini",
        prompt: "prompt",
        fileName: "doc.txt",
        mimeType: "text/plain",
        base64: "YWJj",
      })
    ).toEqual({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: "prompt" },
            {
              type: "input_file",
              filename: "doc.txt",
              file_data: "data:text/plain;base64,YWJj",
            },
          ],
        },
      ],
    });
  });

  it("builds the UTF-8 text shortcut response", () => {
    const response = buildTextIngestShortcutResponse({
      fileName: "notes.txt",
      mimeType: "text/plain",
      rawText: "alpha\nbeta",
      lines: ["alpha", "beta"],
    });

    expect(response.ok).toBe(true);
    expect(response.resolvedKind).toBe("text");
    expect(response.result.kinCompact).toEqual(["alpha", "beta"]);
    expect(response.kinBlocks.length).toBeGreaterThan(0);
    expect(response.usage.totalTokens).toBe(0);
  });

  it("builds parse and upstream error payloads", () => {
    expect(
      buildIngestOpenAIErrorResponse({
        detail: { message: "bad" },
        status: 502,
      })
    ).toEqual({
      body: {
        error: "OpenAI ingest failed",
        detail: { message: "bad" },
      },
      status: 502,
    });

    expect(
      buildIngestParseFailureResponse({
        raw: "broken",
        usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 },
      })
    ).toEqual({
      body: {
        error: "Failed to parse ingestion JSON",
        raw: "broken",
        usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 },
      },
      status: 500,
    });
  });

  it("builds the success response with selected lines", () => {
    const response = buildIngestSuccessResponse({
      uploadKind: "visual",
      normalized: {
        title: "Doc",
        sourceKind: "image/png",
        rawText: "",
        structuredSummary: [],
        kinCompact: ["a"],
        kinDetailed: ["a", "b"],
        warnings: ["warn"],
      },
      selectedLines: ["a", "b"],
      summaryLevel: "kin_detailed",
      usage: { inputTokens: 4, outputTokens: 5, totalTokens: 9 },
    });

    expect(response.ok).toBe(true);
    expect(response.resolvedKind).toBe("visual");
    expect(response.result.selectedLines).toEqual(["a", "b"]);
    expect(response.usage.totalTokens).toBe(9);
  });
});
