import { describe, expect, it } from "vitest";
import {
  buildLibrarySummaryPrompt,
  buildLibrarySummarySuccessResponse,
  resolveLibrarySummaryRequest,
} from "@/lib/server/librarySummary/routeBuilders";

describe("librarySummary routeBuilders", () => {
  it("resolves and trims request fields", () => {
    expect(
      resolveLibrarySummaryRequest({
        title: "  Napoleon  ",
        text: "  History  ",
      })
    ).toEqual({
      title: "Napoleon",
      text: "History",
    });

    expect(resolveLibrarySummaryRequest({})).toEqual({
      title: "Imported document",
      text: "",
    });
  });

  it("builds the summary prompt", () => {
    expect(
      buildLibrarySummaryPrompt({
        title: "Napoleon",
        text: "History text",
      })
    ).toEqual([
      expect.objectContaining({
        role: "system",
      }),
      {
        role: "user",
        content: "TITLE:\nNapoleon\n\nDOCUMENT:\nHistory text",
      },
    ]);
  });

  it("builds the success response payload", () => {
    expect(
      buildLibrarySummarySuccessResponse({
        summary: "  short summary  ",
        usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 },
      })
    ).toEqual({
      summary: "short summary",
      usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 },
    });
  });
});
