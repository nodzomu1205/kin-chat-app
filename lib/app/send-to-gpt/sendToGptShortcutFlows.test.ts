import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  extractWebsiteMapTarget,
  runWebsiteMapShortcut,
} from "@/lib/app/send-to-gpt/sendToGptShortcutFlows";
import {
  fetchWebsiteMap,
  fetchWebsiteMapPageText,
} from "@/lib/app/website-map/websiteMapClient";
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

describe("sendToGptShortcutFlows", () => {
  beforeEach(() => {
    vi.mocked(fetchWebsiteMap).mockReset();
    vi.mocked(fetchWebsiteMapPageText).mockReset();
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
    expect(recordIngestedDocument).not.toHaveBeenCalled();
    expect(messages.at(-1)?.text).toContain("# Website Map: example.com");
    expect(messages.at(-1)?.text).toContain("[Save Site Map]");
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
        title: "Website Map: example.com",
        filename: "example.com.website-map.md",
      })
    );
    expect(messages.at(-1)?.text).toContain("Site map saved to the library.");
    expect(setGptInput).toHaveBeenCalledWith("");
    expect(setGptLoading).toHaveBeenLastCalledWith(false);
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
