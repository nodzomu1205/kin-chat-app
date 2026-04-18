import { describe, expect, it } from "vitest";
import {
  buildLibrarySummaryErrorMessage,
  buildLibrarySummaryRequestBody,
  normalizeLibrarySummaryUsage,
  resolveLibrarySummaryResponseData,
} from "@/lib/app/librarySummaryClientBuilders";

describe("librarySummaryClientBuilders", () => {
  it("builds the request body", () => {
    expect(
      buildLibrarySummaryRequestBody({
        title: "Napoleon",
        text: "Document text",
      })
    ).toEqual({
      title: "Napoleon",
      text: "Document text",
    });
  });

  it("normalizes response data safely", () => {
    expect(
      resolveLibrarySummaryResponseData({
        summary: "Short summary",
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      })
    ).toEqual({
      summary: "Short summary",
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      error: undefined,
    });

    expect(resolveLibrarySummaryResponseData("bad")).toEqual({});
  });

  it("builds an error message from API data", () => {
    expect(
      buildLibrarySummaryErrorMessage({
        data: { error: "Summary failed." },
        fallback: "Fallback message",
      })
    ).toBe("Summary failed.");

    expect(
      buildLibrarySummaryErrorMessage({
        data: {},
        fallback: "Fallback message",
      })
    ).toBe("Fallback message");
  });

  it("normalizes partial token usage", () => {
    expect(
      normalizeLibrarySummaryUsage({
        inputTokens: 10,
      })
    ).toEqual({
      inputTokens: 10,
      outputTokens: 0,
      totalTokens: 0,
    });
  });
});
