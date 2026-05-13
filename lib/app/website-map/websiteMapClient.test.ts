import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildWebsiteMapDocument,
  fetchWebsiteMap,
  fetchWebsiteMapPageText,
  formatWebsiteMapFileLinks,
  formatWebsiteMapPageText,
} from "@/lib/app/website-map/websiteMapClient";
import type { WebsiteMapResult } from "@/lib/app/website-map/websiteMapTypes";

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

  it("formats a website map as a stored library document", () => {
    const document = buildWebsiteMapDocument(buildWebsiteMapResult());

    expect(document.title).toBe("Website Map: example.com");
    expect(document.filename).toBe("example.com.website-map.md");
    expect(document.summary).toContain("123 estimated chars");
    expect(document.text).toContain("## Summary");
    expect(document.text).toContain("[Get Site Contents]");
    expect(document.text).toContain("[Save Site Map]");
    expect(document.text).toContain("[Download File]");
    expect(document.text).not.toContain("取得設定:");
    expect(document.text).not.toContain("深さ 0");
    expect(document.text).not.toContain("取得ページ: 1件");
    expect(document.text).not.toContain("保存したファイル: 1件");
    expect(document.text).toContain("PDF等のファイル本文はまだ読んでいません");
    expect(document.text).toContain("## Areas");
    expect(document.text).toContain("| 領域 | ページ | 推定本文量 |");
    expect(document.text).toContain("[Home](https://example.com)");
    expect(document.text).toContain("## Next Links");
    expect(document.text).toContain("[About](https://example.com/about)");
    expect(document.text).toContain("[サイトマップ取得](/__gpt-command?mode=run&text=");
    expect(document.text).not.toContain("見つけたページ");
    expect(document.text).not.toContain("| # | 領域 | 深さ | 文字 | Files | ページ | URL |");
    expect(document.text).toContain("## Pages");
    expect(document.structuredPayload.version).toBe("0.1-website-map");
  });

  it("requests and formats page text", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          url: "https://example.com/about",
          finalUrl: "https://example.com/about",
          title: "About",
          contentType: "text/html",
          status: 200,
          text: "About text",
          textCharEstimate: 10,
          images: [
            {
              url: "https://example.com/chart.png",
              alt: "Chart",
              width: 640,
              height: 360,
            },
          ],
          fetchedAt: "2026-05-13T00:00:00.000Z",
        })
      )
    );

    const result = await fetchWebsiteMapPageText("https://example.com/about");
    expect(fetchMock).toHaveBeenCalledWith("/api/website-map/page-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com/about" }),
    });
    expect(formatWebsiteMapPageText(result)).toContain("# Site Contents: About");
    expect(formatWebsiteMapPageText(result)).toContain("## Images");
    expect(formatWebsiteMapPageText(result)).toContain(
      "[Open Image](https://example.com/chart.png)"
    );
  });

  it("formats detected files with download and read actions", () => {
    const text = formatWebsiteMapFileLinks(buildWebsiteMapResult());

    expect(text).toContain("## Files");
    expect(text).toContain("[Download File](https://example.com/report.pdf)");
    expect(text).toContain("[Download and Read](/__gpt-command?mode=run&text=");
  });

  it("shows a warning when the crawl stopped on the time budget", () => {
    const document = buildWebsiteMapDocument({
      ...buildWebsiteMapResult(),
      timedOut: true,
      timeBudgetMs: 45000,
    });

    expect(document.text).toContain("取得時間の安全上限");
  });
});

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
