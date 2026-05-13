import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildWebsiteMapDocument,
  fetchWebsiteMap,
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
      pages: [{ title: "Home" }],
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/website-map", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com" }),
    });
  });

  it("formats a website map as a stored library document", () => {
    const document = buildWebsiteMapDocument(buildWebsiteMapResult());

    expect(document.title).toBe("Website Map: example.com");
    expect(document.filename).toBe("example.com.website-map.md");
    expect(document.text).toContain("Pages mapped: 1");
    expect(document.text).toContain("Linked files detected: 1");
    expect(document.structuredPayload.version).toBe("0.1-website-map");
  });
});

function buildWebsiteMapResult(): WebsiteMapResult {
  return {
    version: "0.1-website-map",
    rootUrl: "https://example.com",
    finalRootUrl: "https://example.com",
    host: "example.com",
    crawledAt: "2026-05-13T00:00:00.000Z",
    maxDepth: 2,
    maxPages: 50,
    maxFiles: 20,
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
