import { describe, expect, it } from "vitest";
import {
  extractLinks,
  extractPageContent,
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

  it("prefers main content and images over navigation chrome", () => {
    const content = extractPageContent(
      [
        "<header>Company Careers Network Search</header>",
        '<nav>IR latest Strategy Library Calendar</nav>',
        '<main><h1>Financial highlights</h1><p>過去3年分の主な財務指標を掲載しています。</p><img src="/chart.png" alt="財務指標グラフ" width="640" height="360"></main>',
        "<footer>Social Media Contact Copyright</footer>",
      ].join(""),
      "https://example.com/ir/data/"
    );

    expect(content.text).toContain("過去3年分の主な財務指標");
    expect(content.text).not.toContain("Company Careers Network");
    expect(content.images).toEqual([
      {
        url: "https://example.com/chart.png",
        alt: "財務指標グラフ",
        width: 640,
        height: 360,
      },
    ]);
  });

  it("ignores tiny main-like candidates and falls back to cleaned document content", () => {
    const content = extractPageContent(
      [
        '<main id="skip">Main</main>',
        "<header>Global navigation Search Careers</header>",
        '<section class="contents"><h1>財務・業績データ</h1><p>過去3年分の主な財務指標を掲載しています。</p><img data-srcset="/chart-large.png 2x, /chart.png 1x" alt="財務指標グラフ"></section>',
      ].join(""),
      "https://example.com/ir/"
    );

    expect(content.text).toContain("財務・業績データ");
    expect(content.text).not.toBe("Main");
    expect(content.images[0]).toMatchObject({
      url: "https://example.com/chart-large.png",
      alt: "財務指標グラフ",
    });
  });

  it("falls back from a short candidate when the cleaned page has main signals", () => {
    const content = extractPageContent(
      [
        "<header>Global navigation Search Careers</header>",
        '<section class="contents"><p>コンテナターミナル事業 (1分50秒)</p><p>インドネシアの経済成長に貢献</p></section>',
        "<div><h2>事業概要</h2><p>デジタル・電力ソリューション本部は、電力を基盤にデジタルを活用したソリューション・サービスを提供しています。</p><p>主なプロジェクトとして発電事業、海底通信ケーブル事業、港湾ターミナル事業があります。</p></div>",
      ].join(""),
      "https://example.com/ir/"
    );

    expect(content.text).toContain("事業概要");
    expect(content.text).toContain("港湾ターミナル事業");
  });

  it("keeps global main content sections while stripping global navigation", () => {
    const content = extractPageContent(
      [
        '<div class="global_nav">会社情報 リリース サステナビリティ Careers</div>',
        '<section class="global_main-contents__section"><div class="module_layout"><h2>事業概要</h2><p>デジタル・電力ソリューション本部は、電力を基盤にデジタルを活用したソリューション・サービスを提供しています。</p></div></section>',
      ].join(""),
      "https://example.com/"
    );

    expect(content.text).toContain("事業概要");
    expect(content.text).toContain("ソリューション・サービス");
    expect(content.text).not.toContain("Careers");
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
