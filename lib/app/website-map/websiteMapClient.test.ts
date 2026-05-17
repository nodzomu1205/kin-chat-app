import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildWebsiteMapDocument,
  buildWebsiteMapSiteDocument,
  fetchWebsiteMap,
  fetchWebsiteMapPageText,
  formatWebsiteMapFileLinks,
  formatWebsiteMapPageText,
  formatWebsiteMapSiteReport,
} from "@/lib/app/website-map/websiteMapClient";
import type {
  WebsiteMapPageTextResult,
  WebsiteMapResult,
} from "@/lib/app/website-map/websiteMapTypes";

describe("websiteMapClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requests a website map", async () => {
    const result = buildWebsiteMapResult();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, ...result }))
    );

    await expect(fetchWebsiteMap({ url: "https://example.com" })).resolves.toMatchObject({
      host: "example.com",
      maxDepth: 0,
      pages: [{ title: "Home" }],
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/website-map", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com" }),
      signal: expect.any(AbortSignal),
    });
  });

  it("formats a combined website site report as a stored library document", () => {
    const document = buildWebsiteMapSiteDocument({
      result: buildWebsiteMapResult(),
      pageText: buildPageTextResult(),
    });

    expect(document.title).toBe("Home");
    expect(document.filename).toBe("Home.website-map.md");
    expect(document.summary).toContain("14 chars");
    expect(document.text).toContain("# Website Map: example.com");
    expect(document.text).toContain("## Summary");
    expect(document.text).toContain("- 本文量: 14文字");
    expect(document.text).toContain("[Save Site]");
    expect(document.text).not.toContain("[Get Site Contents]");
    expect(document.text).not.toContain("[Save Site Map]");
    expect(document.text).toContain("## Areas");
    expect(document.text).toContain("[Home](https://example.com)");
    expect(document.text).toContain("## Next Links");
    expect(document.text).toContain("[About](https://example.com/about)");
    expect(document.text).toContain("## Main Text: Home");
    expect(document.text).toContain("Page body text");
    expect(document.text).toContain("[Open Image](https://example.com/chart.png)");
    expect(document.text).toContain("## Download Files");
    expect(document.text).toContain("[Download File](https://example.com/report.pdf)");
    expect(document.text).toContain("[Read and save](/__gpt-command?mode=run&text=");
    expect(document.text).not.toContain("[Download and Read]");
    expect(document.text).not.toContain("推定本文量");
    expect(document.text.indexOf("## Main Text: Home")).toBeGreaterThan(
      document.text.indexOf("## Summary")
    );
    expect(document.text.indexOf("## Download Files")).toBeGreaterThan(
      document.text.indexOf("Page body text")
    );
    expect(document.text.indexOf("## Areas")).toBeGreaterThan(
      document.text.indexOf("## Download Files")
    );
    expect(document.structuredPayload.version).toBe("0.1-website-map");
  });

  it("keeps the legacy document builder on the combined site report path", () => {
    const document = buildWebsiteMapDocument(buildWebsiteMapResult());

    expect(document.text).toContain("# Website Map: example.com");
    expect(document.text).toContain("# Site Contents: https://example.com");
    expect(document.text).toContain("## Download Files");
  });

  it("requests and formats page text", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, ...buildPageTextResult() }))
    );

    const result = await fetchWebsiteMapPageText("https://example.com/about");
    expect(fetchMock).toHaveBeenCalledWith("/api/website-map/page-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com/about" }),
    });
    expect(formatWebsiteMapPageText(result)).toContain("# Site Contents: Home");
    expect(formatWebsiteMapPageText(result)).toContain("- 本文量: 14文字");
    expect(formatWebsiteMapPageText(result)).not.toContain("推定本文量");
    expect(formatWebsiteMapPageText(result)).toContain("## Images");
    expect(formatWebsiteMapPageText(result)).toContain(
      "[Open Image](https://example.com/chart.png)"
    );
  });

  it("formats detected files with download and read actions", () => {
    const text = formatWebsiteMapFileLinks(buildWebsiteMapResult());

    expect(text).toContain("## Files");
    expect(text).toContain("[Save Site]");
    expect(text).not.toContain("[Get Site Contents]");
    expect(text).toContain("[Download File](https://example.com/report.pdf)");
    expect(text).toContain("[Read and save](/__gpt-command?mode=run&text=");
    expect(text).not.toContain("[Download and Read]");
  });

  it("formats a combined website map report", () => {
    const text = formatWebsiteMapSiteReport({
      result: buildWebsiteMapResult(),
      pageText: buildPageTextResult(),
    });

    expect(text).toContain("# Website Map: example.com");
    expect(text).toContain("## Main Text: Home");
    expect(text).toContain("## Download Files");
    expect(text).toContain("[Save Site]");
    expect(text).not.toContain("[Get Site Contents]");
  });

  it("shows a warning when the crawl stopped on the time budget", () => {
    const document = buildWebsiteMapSiteDocument({
      result: {
        ...buildWebsiteMapResult(),
        timedOut: true,
        timeBudgetMs: 45000,
      },
      pageText: buildPageTextResult(),
    });

    expect(document.text).toContain("取得時間の安全上限");
  });
});

function buildPageTextResult(): WebsiteMapPageTextResult {
  return {
    url: "https://example.com",
    finalUrl: "https://example.com",
    title: "Home",
    contentType: "text/html",
    status: 200,
    text: "Page body text",
    textCharEstimate: 14,
    images: [
      {
        url: "https://example.com/chart.png",
        alt: "Chart",
        width: 640,
        height: 360,
      },
    ],
    fetchedAt: "2026-05-13T00:00:00.000Z",
  };
}

function buildWebsiteMapResult(): WebsiteMapResult {
  return {
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
        title: "Home",
        depth: 0,
        status: 200,
        contentType: "text/html",
        textCharEstimate: 123,
        linkCount: 2,
        sameHostLinkCount: 1,
        fileLinkCount: 1,
        sameHostLinks: [
          {
            url: "https://example.com/about",
            label: "About",
          },
        ],
        fileLinks: [
          {
            url: "https://example.com/report.pdf",
            label: "Report",
          },
        ],
        summary: "Welcome",
      },
    ],
    files: [
      {
        url: "https://example.com/report.pdf",
        sourcePageUrl: "https://example.com",
        label: "Report",
        kind: "pdf",
        contentType: "application/pdf",
        contentLength: 1000,
        status: 200,
      },
    ],
    skipped: [],
  };
}
