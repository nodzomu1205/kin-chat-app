import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  extractWebsiteMapTarget,
  runWebsiteMapShortcut,
} from "@/lib/app/send-to-gpt/sendToGptShortcutFlows";
import {
  fetchWebsiteMap,
  fetchWebsiteMapPageText,
} from "@/lib/app/website-map/websiteMapClient";
import { requestFileIngest } from "@/lib/app/ingest/ingestClient";
import { resolveGeneratedImportSummary } from "@/lib/app/ingest/importSummaryGeneration";
import type { Message } from "@/types/chat";

vi.mock("@/lib/app/website-map/websiteMapClient", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/app/website-map/websiteMapClient")>(
      "@/lib/app/website-map/websiteMapClient"
    );

  return {
    ...actual,
    fetchWebsiteMap: vi.fn(),
    fetchWebsiteMapPageText: vi.fn(),
  };
});

vi.mock("@/lib/app/ingest/importSummaryGeneration", () => ({
  resolveGeneratedImportSummary: vi.fn(async (args: {
    fallbackSummary?: string;
    currentUsage: { inputTokens: number; outputTokens: number; totalTokens: number };
  }) => ({
    summary: args.fallbackSummary || "",
    summarySourceText: "",
    totalUsage: args.currentUsage,
  })),
}));

vi.mock("@/lib/app/ingest/ingestClient", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/app/ingest/ingestClient")>(
      "@/lib/app/ingest/ingestClient"
    );

  return {
    ...actual,
    requestFileIngest: vi.fn(),
  };
});

describe("sendToGptShortcutFlows", () => {
  beforeEach(() => {
    vi.mocked(fetchWebsiteMap).mockReset();
    vi.mocked(fetchWebsiteMapPageText).mockReset();
    vi.mocked(requestFileIngest).mockReset();
    vi.mocked(resolveGeneratedImportSummary).mockClear();
  });

  it("extracts website map targets from English and Japanese prefixes", () => {
    expect(
      extractWebsiteMapTarget("Website Map: https://example.com/docs")
    ).toBe("https://example.com/docs");
    expect(
      extractWebsiteMapTarget("サイトマップ： https://example.com")
    ).toBe("https://example.com");
    expect(
      extractWebsiteMapTarget("Save Site Map: https://example.com")
    ).toBe("https://example.com");
    expect(
      extractWebsiteMapTarget("Get Site Contents: https://example.com")
    ).toBe("https://example.com");
    expect(
      extractWebsiteMapTarget("Download File: https://example.com")
    ).toBe("https://example.com");
    expect(
      extractWebsiteMapTarget("Download and Read File: https://example.com/report.pdf")
    ).toBe("https://example.com/report.pdf");
    expect(extractWebsiteMapTarget("URL: https://example.com")).toBe("");
  });

  it("shows a crawled website map in chat before saving", async () => {
    const messages: Message[] = [];
    const setGptMessages = (
      updater: Message[] | ((previous: Message[]) => Message[])
    ) => {
      if (typeof updater === "function") {
        messages.splice(0, messages.length, ...updater(messages));
      } else {
        messages.splice(0, messages.length, ...updater);
      }
    };
    const setGptInput = vi.fn();
    const setGptLoading = vi.fn();
    const recordIngestedDocument = vi.fn(() => ({ id: "DOC-1" }));

    vi.mocked(fetchWebsiteMap).mockResolvedValue({
      version: "0.1-website-map",
      rootUrl: "https://example.com",
      finalRootUrl: "https://example.com",
      host: "example.com",
      crawledAt: "2026-05-13T00:00:00.000Z",
      maxDepth: 0,
      maxPages: 1,
      maxFiles: null,
      pages: [
        {
          url: "https://example.com",
          finalUrl: "https://example.com",
          title: "Example",
          depth: 0,
          status: 200,
          contentType: "text/html",
          textCharEstimate: 120,
          linkCount: 1,
          sameHostLinkCount: 1,
          fileLinkCount: 0,
          sameHostLinks: [
            {
              url: "https://example.com/about",
              label: "About",
            },
          ],
          fileLinks: [],
          summary: "Example summary",
        },
      ],
      files: [],
      skipped: [],
    });
    vi.mocked(fetchWebsiteMapPageText).mockResolvedValue({
      url: "https://example.com",
      finalUrl: "https://example.com",
      title: "Example",
      contentType: "text/html",
      status: 200,
      text: "Example page text",
      textCharEstimate: 17,
      images: [],
      fetchedAt: "2026-05-13T00:00:00.000Z",
    });

    await runWebsiteMapShortcut({
      rawText: "Website Map: https://example.com",
      websiteMapTarget: "https://example.com",
      recordIngestedDocument,
      setGptMessages,
      setGptInput,
      setGptLoading,
    });

    expect(fetchWebsiteMap).toHaveBeenCalledWith({
      url: "https://example.com",
      maxDepth: 0,
      maxPages: 1,
    });
    expect(fetchWebsiteMapPageText).toHaveBeenCalledWith("https://example.com");
    expect(recordIngestedDocument).not.toHaveBeenCalled();
    expect(messages.at(-1)?.text).toContain("# Website Map: example.com");
    expect(messages.at(-1)?.text).toContain("## Main Text: Example");
    expect(messages.at(-1)?.text).toContain("## Download Files");
    expect(messages.at(-1)?.text).toContain("[Save Site]");
    expect(messages.at(-1)?.text).not.toContain("[Get Site Contents]");
    expect(setGptInput).toHaveBeenCalledWith("");
    expect(setGptLoading).toHaveBeenLastCalledWith(false);
  });

  it("stores a crawled website map in the library when requested", async () => {
    const messages: Message[] = [];
    const setGptMessages = (
      updater: Message[] | ((previous: Message[]) => Message[])
    ) => {
      if (typeof updater === "function") {
        messages.splice(0, messages.length, ...updater(messages));
      } else {
        messages.splice(0, messages.length, ...updater);
      }
    };
    const setGptInput = vi.fn();
    const setGptLoading = vi.fn();
    const recordIngestedDocument = vi.fn(() => ({ id: "DOC-1" }));

    vi.mocked(fetchWebsiteMap).mockResolvedValue(buildWebsiteMapResult());
    vi.mocked(fetchWebsiteMapPageText).mockResolvedValue({
      url: "https://example.com",
      finalUrl: "https://example.com",
      title: "Example",
      contentType: "text/html",
      status: 200,
      text: "Example page text",
      textCharEstimate: 17,
      images: [],
      fetchedAt: "2026-05-13T00:00:00.000Z",
    });

    await runWebsiteMapShortcut({
      rawText: "Save Site Map: https://example.com",
      websiteMapTarget: "https://example.com",
      recordIngestedDocument,
      setGptMessages,
      setGptInput,
      setGptLoading,
    });

    expect(recordIngestedDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        artifactType: "reference_note",
        title: "Example",
        filename: "Example.website-map.md",
        text: expect.stringContaining("## Main Text: Example"),
      })
    );
    expect(resolveGeneratedImportSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
        title: "Example",
      })
    );
    expect(messages.at(-1)?.text).toContain("Site map saved to the library.");
    expect(setGptInput).toHaveBeenCalledWith("");
    expect(setGptLoading).toHaveBeenLastCalledWith(false);
  });

  it("generates a website map library summary when enabled", async () => {
    const messages: Message[] = [];
    const setGptMessages = (
      updater: Message[] | ((previous: Message[]) => Message[])
    ) => {
      if (typeof updater === "function") {
        messages.splice(0, messages.length, ...updater(messages));
      } else {
        messages.splice(0, messages.length, ...updater);
      }
    };
    const applyIngestUsage = vi.fn();
    const recordIngestedDocument = vi.fn(() => ({ id: "DOC-1" }));

    vi.mocked(fetchWebsiteMap).mockResolvedValue(buildWebsiteMapResult());
    vi.mocked(fetchWebsiteMapPageText).mockResolvedValue({
      url: "https://example.com",
      finalUrl: "https://example.com",
      title: "Example",
      contentType: "text/html",
      status: 200,
      text: "Example page text",
      textCharEstimate: 17,
      images: [],
      fetchedAt: "2026-05-13T00:00:00.000Z",
    });
    vi.mocked(resolveGeneratedImportSummary).mockResolvedValueOnce({
      summary: "Generated summary.",
      summarySourceText: "source",
      totalUsage: { inputTokens: 10, outputTokens: 4, totalTokens: 14 },
    });

    await runWebsiteMapShortcut({
      rawText: "Save Site Map: https://example.com",
      websiteMapTarget: "https://example.com",
      recordIngestedDocument,
      autoGenerateLibrarySummary: true,
      applyIngestUsage,
      setGptMessages,
      setGptInput: vi.fn(),
      setGptLoading: vi.fn(),
    });

    expect(recordIngestedDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: "Generated summary.",
      })
    );
    expect(applyIngestUsage).toHaveBeenCalledWith({
      inputTokens: 10,
      outputTokens: 4,
      totalTokens: 14,
    });
  });

  it("shows site contents in chat", async () => {
    const messages: Message[] = [];
    const setGptMessages = (
      updater: Message[] | ((previous: Message[]) => Message[])
    ) => {
      if (typeof updater === "function") {
        messages.splice(0, messages.length, ...updater(messages));
      } else {
        messages.splice(0, messages.length, ...updater);
      }
    };

    vi.mocked(fetchWebsiteMapPageText).mockResolvedValue({
      url: "https://example.com/about",
      finalUrl: "https://example.com/about",
      title: "About",
      contentType: "text/html",
      status: 200,
      text: "About text",
      textCharEstimate: 10,
      images: [],
      fetchedAt: "2026-05-13T00:00:00.000Z",
    });

    await runWebsiteMapShortcut({
      rawText: "Get Site Contents: https://example.com/about",
      websiteMapTarget: "https://example.com/about",
      recordIngestedDocument: vi.fn(() => ({ id: "DOC-1" })),
      setGptMessages,
      setGptInput: vi.fn(),
      setGptLoading: vi.fn(),
    });

    expect(fetchWebsiteMapPageText).toHaveBeenCalledWith(
      "https://example.com/about"
    );
    expect(messages.at(-1)?.text).toContain("# Site Contents: About");
    expect(messages.at(-1)?.text).toContain("About text");
  });

  it("records file ingest usage for Read and save even when summary generation is disabled", async () => {
    const messages: Message[] = [];
    const setGptMessages = (
      updater: Message[] | ((previous: Message[]) => Message[])
    ) => {
      if (typeof updater === "function") {
        messages.splice(0, messages.length, ...updater(messages));
      } else {
        messages.splice(0, messages.length, ...updater);
      }
    };
    const applyIngestUsage = vi.fn();
    const recordIngestedDocument = vi.fn(() => ({ id: "DOC-1" }));
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Blob(["pdf bytes"], { type: "application/pdf" }), {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "x-final-url": "https://example.com/report.pdf",
        },
      })
    );
    vi.mocked(requestFileIngest).mockResolvedValue({
      response: new Response("{}", { status: 200 }),
      data: {
        result: {
          title: "Report PDF",
          rawText: "Extracted PDF body",
        },
        usage: { inputTokens: 5, outputTokens: 6, totalTokens: 11 },
      },
      resolvedKind: "pdf",
    });

    await runWebsiteMapShortcut({
      rawText: "Download and Read File: https://example.com/report.pdf",
      websiteMapTarget: "https://example.com/report.pdf",
      recordIngestedDocument,
      autoGenerateLibrarySummary: false,
      applyIngestUsage,
      setGptMessages,
      setGptInput: vi.fn(),
      setGptLoading: vi.fn(),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/website-map/file?url=https%3A%2F%2Fexample.com%2Freport.pdf",
      { cache: "no-store" }
    );
    expect(resolveGeneratedImportSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
        currentUsage: { inputTokens: 5, outputTokens: 6, totalTokens: 11 },
      })
    );
    expect(applyIngestUsage).toHaveBeenCalledWith({
      inputTokens: 5,
      outputTokens: 6,
      totalTokens: 11,
    });
    expect(recordIngestedDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Report PDF",
        text: "Extracted PDF body",
      })
    );
  });
});

function buildWebsiteMapResult() {
  return {
    version: "0.1-website-map" as const,
    rootUrl: "https://example.com",
    finalRootUrl: "https://example.com",
    host: "example.com",
    crawledAt: "2026-05-13T00:00:00.000Z",
    maxDepth: 0,
    maxPages: 1,
    maxFiles: null,
    pages: [
      {
        url: "https://example.com",
        finalUrl: "https://example.com",
        title: "Example",
        depth: 0,
        status: 200,
        contentType: "text/html",
        textCharEstimate: 120,
        linkCount: 1,
        sameHostLinkCount: 1,
        fileLinkCount: 0,
        sameHostLinks: [
          {
            url: "https://example.com/about",
            label: "About",
          },
        ],
        fileLinks: [],
        summary: "Example summary",
      },
    ],
    files: [],
    skipped: [],
  };
}
