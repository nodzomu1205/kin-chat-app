import { beforeEach, describe, expect, it, vi } from "vitest";

const { callOpenAIResponses, executeSearchRequest, generateLibrarySummary } =
  vi.hoisted(() => ({
    callOpenAIResponses: vi.fn(),
    executeSearchRequest: vi.fn(),
    generateLibrarySummary: vi.fn(),
  }));

vi.mock("@/lib/server/chatgpt/openaiClient", () => ({
  callOpenAIResponses,
}));

vi.mock("@/lib/server/chatgpt/searchExecution", () => ({
  executeSearchRequest,
}));

vi.mock("@/lib/server/librarySummary/summaryService", () => ({
  generateLibrarySummary,
}));

import {
  handleChatRoute,
  isPlainSearchOnlyInput,
} from "@/lib/server/chatgpt/routeHandlers";

describe("routeHandlers", () => {
  beforeEach(() => {
    callOpenAIResponses.mockReset();
    executeSearchRequest.mockReset();
    generateLibrarySummary.mockReset();
  });

  it("detects plain search-only input", () => {
    expect(isPlainSearchOnlyInput("search: russia economy")).toBe(true);
    expect(
      isPlainSearchOnlyInput("search: russia economy\nWhat does it mean?")
    ).toBe(false);
    expect(isPlainSearchOnlyInput("hello")).toBe(false);
  });

  it("returns shared library summary text for plain search-only input and preserves summary usage", async () => {
    executeSearchRequest.mockResolvedValue({
      searchPromptText: "generic summary",
      searchEvidenceText: "Google Search\n- Source A\nSnippet: summary body",
      returnedSearchContinuationToken: "",
      sources: [{ title: "Source A", link: "https://example.com/a" }],
      rawSources: [{ title: "Source A", link: "https://example.com/a" }],
    });
    generateLibrarySummary.mockResolvedValue({
      text: "Russia economy summary",
      usage: { inputTokens: 7, outputTokens: 11, totalTokens: 18 },
      usageDetails: { model: "gpt-4o-mini" },
    });

    const response = await handleChatRoute({
      input: "search: russia economy",
      memory: {},
      recentMessages: [],
      searchMode: "normal",
      searchEngines: ["google_search"],
      searchLocation: "Japan",
    });

    expect(callOpenAIResponses).not.toHaveBeenCalled();
    expect(generateLibrarySummary).toHaveBeenCalledOnce();
    await expect(response.json()).resolves.toMatchObject({
      reply: "Russia economy summary",
      usage: { inputTokens: 7, outputTokens: 11, totalTokens: 18 },
      usageDetails: { model: "gpt-4o-mini" },
      searchUsed: true,
      searchQuery: "russia economy",
      searchEvidence: "Google Search\n- Source A\nSnippet: summary body",
      searchSummaryText: "Russia economy summary",
      searchSummaryGenerated: true,
      sources: [{ title: "Source A", link: "https://example.com/a" }],
    });
  });

  it("uses raw search evidence when the user asks a follow-up question", async () => {
    executeSearchRequest.mockResolvedValue({
      searchPromptText: "generic summary",
      searchEvidenceText: "raw evidence with article details",
      returnedSearchContinuationToken: "",
      sources: [{ title: "Source A", link: "https://example.com/a" }],
      rawSources: [{ title: "Source A", link: "https://example.com/a" }],
    });
    generateLibrarySummary.mockResolvedValue({
      text: "Russia economy summary",
      usage: { inputTokens: 7, outputTokens: 11, totalTokens: 18 },
      usageDetails: { model: "gpt-4o-mini" },
    });
    callOpenAIResponses.mockResolvedValue({
      text: "Detailed answer",
      usage: { inputTokens: 4, outputTokens: 5, totalTokens: 9 },
      usageDetails: null,
    });

    const response = await handleChatRoute({
      input: "search: russia economy\nWhat does this mean?",
      memory: {},
      recentMessages: [],
      searchMode: "normal",
      searchEngines: ["google_search"],
      searchLocation: "Japan",
    });

    expect(generateLibrarySummary).toHaveBeenCalledOnce();
    expect(callOpenAIResponses).toHaveBeenCalledOnce();
    expect(
      callOpenAIResponses.mock.calls[0]?.[0]?.input?.some?.(
        (message: { content?: string }) =>
          typeof message.content === "string" &&
          message.content.includes("raw evidence with article details")
      )
    ).toBe(true);
    expect(
      callOpenAIResponses.mock.calls[0]?.[0]?.input?.some?.(
        (message: { content?: string }) =>
          typeof message.content === "string" &&
          message.content.includes("Russia economy summary")
      )
    ).toBe(false);
    await expect(response.json()).resolves.toMatchObject({
      reply: "Detailed answer",
      searchUsed: true,
      searchQuery: "russia economy",
      searchSummaryText: "Russia economy summary",
      searchSummaryGenerated: true,
    });
  });
});
