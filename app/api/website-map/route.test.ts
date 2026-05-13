import { describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/website-map/route";
import { crawlWebsiteMap } from "@/lib/server/website-map/websiteMapCrawler";

vi.mock("@/lib/server/website-map/websiteMapCrawler", () => ({
  crawlWebsiteMap: vi.fn(),
}));

const mockedCrawlWebsiteMap = vi.mocked(crawlWebsiteMap);

describe("website-map route", () => {
  it("passes normalized request options to the crawler", async () => {
    mockedCrawlWebsiteMap.mockResolvedValue({
      version: "0.1-website-map",
      rootUrl: "https://example.com",
      finalRootUrl: "https://example.com",
      host: "example.com",
      crawledAt: "2026-05-13T00:00:00.000Z",
      maxDepth: 2,
      maxPages: 50,
      maxFiles: 20,
      pages: [],
      files: [],
      skipped: [],
    });

    const response = await POST(
      new Request("http://localhost/api/website-map", {
        method: "POST",
        body: JSON.stringify({
          url: "https://example.com",
          maxDepth: 2,
          maxPages: 50,
          maxFiles: 20,
        }),
      })
    );
    const data = await response.json();

    expect(data.ok).toBe(true);
    expect(mockedCrawlWebsiteMap).toHaveBeenCalledWith("https://example.com", {
      maxDepth: 2,
      maxPages: 50,
      maxFiles: 20,
    });
  });
});
