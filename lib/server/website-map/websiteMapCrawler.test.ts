import { describe, expect, it } from "vitest";
import {
  extractLinks,
  extractVisibleText,
  parseRobotsTxt,
  resolveHttpUrl,
} from "@/lib/server/website-map/websiteMapCrawler";

describe("websiteMapCrawler helpers", () => {
  it("resolves bare host input as an https URL", () => {
    expect(resolveHttpUrl("example.com/docs").toString()).toBe(
      "https://example.com/docs"
    );
  });

  it("extracts normalized http links and skips non-web anchors", () => {
    const links = extractLinks(
      [
        '<a href="/about#team">About</a>',
        '<a href="report.pdf">PDF report</a>',
        '<a href="mailto:test@example.com">Mail</a>',
        '<a href="javascript:void(0)">Nope</a>',
      ].join("\n"),
      "https://example.com/root/"
    );

    expect(links).toEqual([
      { url: "https://example.com/about", label: "About" },
      { url: "https://example.com/root/report.pdf", label: "PDF report" },
    ]);
  });

  it("extracts visible text without script and style content", () => {
    expect(
      extractVisibleText(
        "<main>Hello&nbsp;world<script>bad()</script><style>.x{}</style></main>"
      )
    ).toBe("Hello world");
  });

  it("parses wildcard robots disallow rules", () => {
    expect(
      parseRobotsTxt(
        ["User-agent: other", "Disallow: /other", "User-agent: *", "Disallow: /private"].join(
          "\n"
        )
      )
    ).toEqual({ disallow: ["/private"] });
  });
});
