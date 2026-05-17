import type {
  WebsiteMapFile,
  WebsiteMapPage,
  WebsiteMapPageTextResult,
  WebsiteMapRequest,
  WebsiteMapResult,
} from "@/lib/app/website-map/websiteMapTypes";

type WebsiteMapApiResponse = Partial<WebsiteMapResult> & {
  ok?: boolean;
  error?: string;
};

type WebsiteMapPageTextApiResponse = Partial<WebsiteMapPageTextResult> & {
  ok?: boolean;
  error?: string;
};

const WEBSITE_MAP_CLIENT_TIMEOUT_MS = 60000;

export async function fetchWebsiteMap(
  request: WebsiteMapRequest
): Promise<WebsiteMapResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBSITE_MAP_CLIENT_TIMEOUT_MS);
  try {
    const response = await fetch("/api/website-map", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => ({}))) as WebsiteMapApiResponse;
    if (!response.ok || data.ok === false) {
      throw new Error(data.error || response.statusText || "Website map failed.");
    }
    return normalizeWebsiteMapResult(data);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Website map timed out. Try a shallower URL or retry later.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchWebsiteMapPageText(
  url: string
): Promise<WebsiteMapPageTextResult> {
  const response = await fetch("/api/website-map/page-text", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });
  const data = (await response.json().catch(() => ({}))) as WebsiteMapPageTextApiResponse;
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || response.statusText || "Website page text failed.");
  }
  return {
    url: data.url || url,
    finalUrl: data.finalUrl || data.url || url,
    title: data.title || data.finalUrl || url,
    contentType: data.contentType || "",
    status: typeof data.status === "number" ? data.status : 0,
    text: data.text || "",
    textCharEstimate:
      typeof data.textCharEstimate === "number"
        ? data.textCharEstimate
        : (data.text || "").length,
    images: Array.isArray(data.images) ? data.images : [],
    fetchedAt: data.fetchedAt || new Date().toISOString(),
  };
}

function normalizeWebsiteMapResult(data: WebsiteMapApiResponse): WebsiteMapResult {
  return {
    version: "0.1-website-map",
    rootUrl: data.rootUrl || "",
    finalRootUrl: data.finalRootUrl || data.rootUrl || "",
    host: data.host || "",
    crawledAt: data.crawledAt || new Date().toISOString(),
    maxDepth: typeof data.maxDepth === "number" ? data.maxDepth : 2,
    maxPages: typeof data.maxPages === "number" ? data.maxPages : null,
    maxFiles: typeof data.maxFiles === "number" ? data.maxFiles : null,
    timedOut: data.timedOut === true,
    timeBudgetMs:
      typeof data.timeBudgetMs === "number" ? data.timeBudgetMs : undefined,
    pages: Array.isArray(data.pages) ? data.pages : [],
    files: Array.isArray(data.files) ? data.files : [],
    skipped: Array.isArray(data.skipped) ? data.skipped : [],
  };
}

export function buildWebsiteMapDocument(result: WebsiteMapResult) {
  return buildWebsiteMapSiteDocument({ result });
}

export function buildWebsiteMapSiteDocument({
  result,
  pageText,
  pageTextError,
}: {
  result: WebsiteMapResult;
  pageText?: WebsiteMapPageTextResult | null;
  pageTextError?: string | null;
}) {
  const title = resolveWebsiteMapDocumentTitle({ result, pageText });
  const text = formatWebsiteMapSiteReport({
    result,
    pageText,
    pageTextError,
  });
  const stats = buildWebsiteMapStats(result);
  const textCharCount = pageText ? countTextChars(pageText.text) : stats.totalTextChars;
  return {
    title,
    filename: `${safeFileBase(title || result.host || "site-report")}.website-map.md`,
    text,
    summary: [
      `${stats.pageCount} pages mapped`,
      `${stats.fileCount} linked files detected`,
      `${textCharCount.toLocaleString("ja-JP")} chars`,
    ].join(" / "),
    structuredPayload: result,
    timestamp: result.crawledAt,
  };
}

export function formatWebsiteMapSiteReport({
  result,
  pageText,
  pageTextError,
}: {
  result: WebsiteMapResult;
  pageText?: WebsiteMapPageTextResult | null;
  pageTextError?: string | null;
}) {
  const stats = buildWebsiteMapStats(result);
  const warnings = buildWebsiteMapWarnings(result, stats);
  const mainTextCharCount = pageText ? countTextChars(pageText.text) : null;

  return [
    `# Website Map: ${result.host || result.rootUrl}`,
    "",
    ...formatWebsiteMapActionLinks(result.rootUrl, "top"),
    "",
    "## Summary",
    "",
    `- 対象サイト: ${result.rootUrl}`,
    result.finalRootUrl !== result.rootUrl ? `- 最終URL: ${result.finalRootUrl}` : "",
    `- 取得日時: ${formatDateTime(pageText?.fetchedAt || result.crawledAt)}`,
    mainTextCharCount !== null
      ? `- 本文量: ${mainTextCharCount.toLocaleString("ja-JP")}文字`
      : "",
    `- ページ上で検知したファイルリンク: ${stats.totalFileLinks.toLocaleString("ja-JP")}件`,
    `- スキップ: ${result.skipped.length.toLocaleString("ja-JP")}件`,
    "",
    ...(warnings.length
      ? ["## Notes", "", ...warnings.map((warning) => `- ${warning}`), ""]
      : []),
    pageText
      ? formatWebsiteMapMainText(pageText)
      : formatWebsiteMapPageTextUnavailable(result.rootUrl, pageTextError),
    "",
    formatWebsiteMapDownloadFiles(result),
    "",
    pageText ? formatWebsiteMapImages(pageText) : "",
    "",
    formatWebsiteMapDetailSections(result),
    "",
    ...formatWebsiteMapActionLinks(result.rootUrl, "bottom"),
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function formatWebsiteMapText(result: WebsiteMapResult) {
  const stats = buildWebsiteMapStats(result);
  const warnings = buildWebsiteMapWarnings(result, stats);
  const sectionCounts = getSectionCounts(result.pages);
  const topTextPages = [...result.pages]
    .sort((a, b) => b.textCharEstimate - a.textCharEstimate)
    .slice(0, 8);
  const filePages = result.pages
    .filter((page) => page.fileLinkCount > 0)
    .sort((a, b) => b.fileLinkCount - a.fileLinkCount)
    .slice(0, 8);
  const discoveredLinks = getDiscoveredSameHostLinks(result.pages);
  const possibleDuplicates = findPossibleDuplicatePages(result.pages);
  const zeroTextPages = result.pages.filter((page) => page.textCharEstimate === 0);

  const lines = [
    `# Website Map: ${result.host || result.rootUrl}`,
    "",
    ...formatWebsiteMapActionLinks(result.rootUrl, "top"),
    "",
    "## Summary",
    "",
    `- 対象サイト: ${result.rootUrl}`,
    result.finalRootUrl !== result.rootUrl
      ? `- 最終URL: ${result.finalRootUrl}`
      : "",
    `- 取得日時: ${formatDateTime(result.crawledAt)}`,
    `- ページ上で検知したファイルリンク: ${stats.totalFileLinks.toLocaleString("ja-JP")}件`,
    `- 本文量: ${stats.totalTextChars.toLocaleString("ja-JP")}文字`,
    `- スキップ: ${result.skipped.length.toLocaleString("ja-JP")}件`,
    "",
    ...(warnings.length
      ? ["## Notes", "", ...warnings.map((warning) => `- ${warning}`), ""]
      : []),
    "## Areas",
    "",
    ...formatSiteReportSectionTable(sectionCounts),
    "",
    "## Priority Pages",
    "",
    ...formatSiteReportPriorityPageTable(topTextPages),
    "",
    "## File Hubs",
    "",
    ...formatFileHubTable(filePages),
    "",
    "## Next Links",
    "",
    ...formatDiscoveredLinkTable(discoveredLinks),
    "",
    "## Files Saved",
    "",
    ...formatFileTable(result.files),
    "",
    "## Review Targets",
    "",
    ...(zeroTextPages.length
      ? [
          "本文0文字のページ:",
          ...zeroTextPages.map((page) => `- ${page.finalUrl}`),
          "",
        ]
      : []),
    ...(possibleDuplicates.length
      ? [
          "重複候補:",
          ...possibleDuplicates.map(
            (pair) =>
              `- ${pair.primary.title || pair.primary.finalUrl}: ${pair.primary.finalUrl} / ${pair.duplicate.finalUrl}`
          ),
        ]
      : ["- 明確な重複候補はありません。"]),
    "",
    "## Pages",
    "",
    ...formatSiteReportPageTable(result.pages),
    "",
    "## Skipped",
    "",
    ...(result.skipped.length
      ? result.skipped.map((item) => `- ${item.url}: ${item.reason}`)
      : ["スキップされたURLはありません。"]),
    "",
    ...formatWebsiteMapActionLinks(result.rootUrl, "bottom"),
  ];
  return lines.filter((line) => line !== "").join("\n");
}

export function formatWebsiteMapPageText(result: WebsiteMapPageTextResult) {
  const textCharCount = countTextChars(result.text);
  return [
    `# Site Contents: ${result.title || result.finalUrl}`,
    "",
    `- URL: ${result.finalUrl}`,
    `- 取得日時: ${formatDateTime(result.fetchedAt)}`,
    `- 本文量: ${textCharCount.toLocaleString("ja-JP")}文字`,
    "",
    "## Main Text",
    "",
    result.text || "本文テキストは取得できませんでした。",
    "",
    "## Images",
    "",
    ...formatPageImageTable(result.images),
  ].join("\n");
}

function formatWebsiteMapMainText(result: WebsiteMapPageTextResult) {
  return [
    `## Main Text: ${result.title || result.finalUrl}`,
    "",
    result.text || "本文テキストを取得できませんでした。",
  ].join("\n");
}

function formatWebsiteMapImages(result: WebsiteMapPageTextResult) {
  return ["## Images", "", ...formatPageImageTable(result.images)].join("\n");
}

function formatWebsiteMapDownloadFiles(result: WebsiteMapResult) {
  return [
    "## Download Files",
    "",
    ...formatDownloadFileTable(result.files),
  ].join("\n");
}

function formatWebsiteMapDetailSections(result: WebsiteMapResult) {
  const sectionCounts = getSectionCounts(result.pages);
  const topTextPages = [...result.pages]
    .sort((a, b) => b.textCharEstimate - a.textCharEstimate)
    .slice(0, 8);
  const filePages = result.pages
    .filter((page) => page.fileLinkCount > 0)
    .sort((a, b) => b.fileLinkCount - a.fileLinkCount)
    .slice(0, 8);
  const discoveredLinks = getDiscoveredSameHostLinks(result.pages);
  const possibleDuplicates = findPossibleDuplicatePages(result.pages);
  const zeroTextPages = result.pages.filter((page) => page.textCharEstimate === 0);

  return [
    "## Areas",
    "",
    ...formatSiteReportSectionTable(sectionCounts),
    "",
    "## Priority Pages",
    "",
    ...formatSiteReportPriorityPageTable(topTextPages),
    "",
    "## File Hubs",
    "",
    ...formatFileHubTable(filePages),
    "",
    "## Next Links",
    "",
    ...formatDiscoveredLinkTable(discoveredLinks),
    "",
    "## Review Targets",
    "",
    ...(zeroTextPages.length
      ? [
          "本文文字数が0のページ:",
          ...zeroTextPages.map((page) => `- ${page.finalUrl}`),
          "",
        ]
      : []),
    ...(possibleDuplicates.length
      ? [
          "重複候補:",
          ...possibleDuplicates.map(
            (pair) =>
              `- ${pair.primary.title || pair.primary.finalUrl}: ${pair.primary.finalUrl} / ${pair.duplicate.finalUrl}`
          ),
        ]
      : ["- 明確な重複候補はありません。"]),
    "",
    "## Pages",
    "",
    ...formatSiteReportPageTable(result.pages),
    "",
    "## Skipped",
    "",
    ...(result.skipped.length
      ? result.skipped.map((item) => `- ${item.url}: ${item.reason}`)
      : ["スキップされたURLはありません。"]),
  ].join("\n");
}

export function formatWebsiteMapFileLinks(result: WebsiteMapResult) {
  return [
    `# Download Files: ${result.host || result.rootUrl}`,
    "",
    ...formatWebsiteMapActionLinks(result.rootUrl, "top"),
    "",
    "## Files",
    "",
    ...formatDownloadFileTable(result.files),
  ].join("\n");
}

function buildWebsiteMapStats(result: WebsiteMapResult) {
  const totalTextChars = result.pages.reduce(
    (sum, page) => sum + page.textCharEstimate,
    0
  );
  const pageCount = result.pages.length;
  const fileCount = result.files.length;
  return {
    pageCount,
    fileCount,
    pdfCount: result.files.filter((file) => file.kind === "pdf").length,
    totalFileLinks: result.pages.reduce(
      (sum, page) => sum + page.fileLinkCount,
      0
    ),
    maxDepthReached: result.pages.reduce(
      (max, page) => Math.max(max, page.depth),
      0
    ),
    totalTextChars,
    averageTextChars: pageCount ? Math.round(totalTextChars / pageCount) : 0,
    zeroTextPages: result.pages.filter((page) => page.textCharEstimate === 0),
    pagesWithFiles: result.pages.filter((page) => page.fileLinkCount > 0),
  };
}

function buildWebsiteMapWarnings(
  result: WebsiteMapResult,
  stats: ReturnType<typeof buildWebsiteMapStats>
) {
  const warnings: string[] = [];
  if (
    !(result.maxDepth === 0 && result.maxPages === 1) &&
    result.maxPages !== null &&
    stats.pageCount >= result.maxPages
  ) {
    warnings.push(
      `ページ上限 ${result.maxPages.toLocaleString("ja-JP")}件に到達しています。サイト全体ではなく、取得できた範囲の地図です。`
    );
  }
  if (result.maxFiles !== null && stats.fileCount >= result.maxFiles) {
    warnings.push(
      `ファイル上限 ${result.maxFiles.toLocaleString("ja-JP")}件に到達しています。PDF等の一覧は途中で切れている可能性があります。`
    );
  }
  if (result.timedOut) {
    warnings.push(
      `取得時間の安全上限${result.timeBudgetMs ? `（約${Math.round(result.timeBudgetMs / 1000)}秒）` : ""}に到達したため、取得できた範囲までを保存しています。`
    );
  }
  if (
    result.maxPages !== null &&
    stats.maxDepthReached < result.maxDepth &&
    stats.pageCount >= result.maxPages
  ) {
    warnings.push(
      `深さ ${result.maxDepth} まで設定されていますが、ページ上限に先に到達したため深さ ${stats.maxDepthReached} までの取得が中心です。`
    );
  }
  if (stats.totalFileLinks > stats.fileCount) {
    warnings.push(
      `ページ上では ${stats.totalFileLinks.toLocaleString("ja-JP")}件のファイルリンクを検知しましたが、保存したファイル一覧は ${stats.fileCount.toLocaleString("ja-JP")}件です。`
    );
  }
  if (stats.zeroTextPages.length > 0) {
    warnings.push(
      `本文0文字のページが ${stats.zeroTextPages.length.toLocaleString("ja-JP")}件あります。JavaScript描画や抽出失敗の可能性があります。`
    );
  }
  if (stats.pagesWithFiles.length > 0) {
    warnings.push(
      `PDF等のファイル本文はまだ読んでいません。ここではリンク、種類、サイズ、取得状態だけを記録しています。`
    );
  }
  return warnings;
}

function getSectionCounts(pages: WebsiteMapPage[]) {
  const counts = new Map<string, { count: number; textChars: number }>();
  for (const page of pages) {
    const section = getPrimaryPathSection(page.finalUrl);
    const current = counts.get(section) || { count: 0, textChars: 0 };
    counts.set(section, {
      count: current.count + 1,
      textChars: current.textChars + page.textCharEstimate,
    });
  }
  return [...counts.entries()]
    .map(([name, value]) => ({ name, ...value }))
    .sort((a, b) => b.count - a.count || b.textChars - a.textChars)
    .slice(0, 12);
}

function getPrimaryPathSection(url: string) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts[0] === "jp" && parts[1]) {
      const section = parts[2] || "";
      if (!section || /^index\.html?$/i.test(section)) return "top";
      return section;
    }
    if (!parts[0] || /^index\.html?$/i.test(parts[0])) return "top";
    return parts[0] || "root";
  } catch {
    return "unknown";
  }
}

function findPossibleDuplicatePages(pages: WebsiteMapPage[]) {
  const byCanonical = new Map<string, WebsiteMapPage>();
  const duplicates: Array<{
    primary: WebsiteMapPage;
    duplicate: WebsiteMapPage;
  }> = [];
  for (const page of pages) {
    const key = canonicalPageKey(page.finalUrl);
    const existing = byCanonical.get(key);
    if (existing && existing.finalUrl !== page.finalUrl) {
      duplicates.push({ primary: existing, duplicate: page });
      continue;
    }
    byCanonical.set(key, page);
  }
  return duplicates.slice(0, 10);
}

function getDiscoveredSameHostLinks(pages: WebsiteMapPage[]) {
  const seen = new Set<string>();
  const discovered: Array<{
    url: string;
    label: string;
  }> = [];
  for (const page of pages) {
    const links = Array.isArray(page.sameHostLinks) ? page.sameHostLinks : [];
    for (const link of links) {
      const key = canonicalPageKey(link.url);
      if (!key || key === canonicalPageKey(page.finalUrl) || seen.has(key)) {
        continue;
      }
      seen.add(key);
      discovered.push({
        url: link.url,
        label: link.label || link.url,
      });
    }
  }
  return discovered;
}

function canonicalPageKey(url: string) {
  try {
    const parsed = new URL(url);
    let pathname = parsed.pathname.replace(/\/index\.html?$/i, "/");
    pathname = pathname.replace(/\/+$/g, "/");
    return `${parsed.host.toLowerCase()}${pathname}`;
  } catch {
    return url;
  }
}

function formatSiteReportSectionTable(
  sections: Array<{ name: string; count: number; textChars: number }>
) {
  if (!sections.length) return ["領域分類に使えるパスは見つかりませんでした。"];
  return [
    "| 領域 | ページ | 本文量 |",
    "| --- | ---: | ---: |",
    ...sections.map(
      (item) =>
        `| ${escapeTableCell(item.name)} | ${item.count.toLocaleString("ja-JP")} | ${item.textChars.toLocaleString("ja-JP")}文字 |`
    ),
  ];
}

function formatSiteReportPriorityPageTable(pages: WebsiteMapPage[]) {
  if (!pages.length) return ["取得ページはありません。"];
  return [
    "| # | 領域 | ページ | 本文量 |",
    "| ---: | --- | --- | ---: |",
    ...pages.map(
      (page, index) =>
        `| ${index + 1} | ${escapeTableCell(getPrimaryPathSection(page.finalUrl))} | ${formatTableLink(page.title || page.finalUrl, page.finalUrl, 46)} | ${page.textCharEstimate.toLocaleString("ja-JP")}文字 |`
    ),
  ];
}

function formatSiteReportPageTable(pages: WebsiteMapPage[]) {
  if (!pages.length) return ["取得ページはありません。"];
  return [
    "| # | 領域 | 本文量 | Files | ページ |",
    "| ---: | --- | ---: | ---: | --- |",
    ...pages.map(
      (page, index) =>
        `| ${index + 1} | ${escapeTableCell(getPrimaryPathSection(page.finalUrl))} | ${page.textCharEstimate.toLocaleString("ja-JP")}文字 | ${page.fileLinkCount.toLocaleString("ja-JP")} | ${formatTableLink(page.title || page.finalUrl, page.finalUrl, 42)} |`
    ),
  ];
}

function formatSectionTable(
  sections: Array<{ name: string; count: number; textChars: number }>
) {
  if (!sections.length) return ["領域分類に使えるパスが見つかりませんでした。"];
  return [
    "| 領域 | ページ | 本文量 |",
    "| --- | ---: | ---: |",
    ...sections.map(
      (item) =>
        `| ${escapeTableCell(item.name)} | ${item.count.toLocaleString("ja-JP")} | ${item.textChars.toLocaleString("ja-JP")}文字 |`
    ),
  ];
}

function formatPriorityPageTable(pages: WebsiteMapPage[]) {
  if (!pages.length) return ["取得ページはありません。"];
  return [
    "| # | 領域 | ページ | 本文量 |",
    "| ---: | --- | --- | ---: |",
    ...pages.map(
      (page, index) =>
        `| ${index + 1} | ${escapeTableCell(getPrimaryPathSection(page.finalUrl))} | ${formatTableLink(page.title || page.finalUrl, page.finalUrl, 46)} | ${page.textCharEstimate.toLocaleString("ja-JP")}文字 |`
    ),
  ];
}

function formatFileHubTable(pages: WebsiteMapPage[]) {
  if (!pages.length) return ["ファイルリンクを含むページは見つかりませんでした。"];
  return [
    "| # | ページ | ファイルリンク |",
    "| ---: | --- | ---: |",
    ...pages.map(
      (page, index) =>
        `| ${index + 1} | ${formatTableLink(page.title || page.finalUrl, page.finalUrl, 50)} | ${page.fileLinkCount.toLocaleString("ja-JP")} |`
    ),
  ];
}

function formatDiscoveredLinkTable(
  links: Array<{
    url: string;
    label: string;
  }>
) {
  if (!links.length) {
    return ["次に掘れる同一サイト内リンクは見つかりませんでした。"];
  }
  return [
    "| # | 領域 | リンク | 操作 |",
    "| ---: | --- | --- | --- |",
    ...links.map(
      (link, index) =>
        `| ${index + 1} | ${escapeTableCell(getPrimaryPathSection(link.url))} | ${formatTableLink(link.label, link.url, 54)} | ${buildWebsiteMapCommandLink(link.url)} |`
    ),
  ];
}

function formatWebsiteMapActionLinks(url: string, position: "top" | "bottom") {
  const separator = position === "top" ? " | " : "\n";
  return [
    [buildCommandLink("Save Site", `Save Site Map: ${url}`)].join(separator),
  ];
}

function formatWebsiteMapPageTextUnavailable(url: string, error?: string | null) {
  return [
    `# Site Contents: ${url}`,
    "",
    "## Main Text",
    "",
    error
      ? `Site contents could not be fetched: ${error}`
      : "Site contents could not be fetched.",
    "",
    "## Images",
    "",
    "No page images were detected.",
  ].join("\n");
}

function formatDownloadFileTable(files: WebsiteMapFile[]) {
  if (!files.length) return ["このページではファイルリンクを検出しませんでした。"];
  return [
    "| # | ファイル | サイズ | 操作 |",
    "| ---: | --- | ---: | --- |",
    ...files.map((file, index) =>
      [
        `| ${index + 1}`,
        formatTableLink(file.label || file.url, file.url, 48),
        typeof file.contentLength === "number" ? formatBytes(file.contentLength) : "-",
        [
          formatTableLink("Download File", file.url, 24),
          buildCommandLink("Read and save", `Download and Read File: ${file.url}`),
        ].join(" / "),
      ].join(" | ") + " |"
    ),
  ];
}

function formatPageImageTable(images: WebsiteMapPageTextResult["images"]) {
  if (!images.length) return ["本文領域内の画像は検出しませんでした。"];
  return [
    "| # | 画像 | Alt | サイズ |",
    "| ---: | --- | --- | ---: |",
    ...images.map((image, index) =>
      [
        `| ${index + 1}`,
        formatTableLink("Open Image", image.url, 24),
        escapeTableCell(image.alt || "-"),
        image.width || image.height
          ? `${image.width || "?"} x ${image.height || "?"}`
          : "-",
      ].join(" | ") + " |"
    ),
  ];
}

function formatFileTable(files: WebsiteMapFile[]) {
  if (!files.length) return ["検出ファイルはありません。"];
  return [
    "| # | ファイル | サイズ | リンク元 |",
    "| ---: | --- | ---: | --- |",
    ...files.map(
      (file, index) =>
        `| ${index + 1} | ${formatTableLink(file.label || file.url, file.url, 42)} | ${typeof file.contentLength === "number" ? formatBytes(file.contentLength) : "-"} | ${formatTableLink(getPrimaryPathSection(file.sourcePageUrl), file.sourcePageUrl, 24)} |`
    ),
  ];
}

function formatPageTable(pages: WebsiteMapPage[]) {
  if (!pages.length) return ["取得ページはありません。"];
  return [
    "| # | 領域 | 文字 | Files | ページ |",
    "| ---: | --- | ---: | ---: | --- |",
    ...pages.map(
      (page, index) =>
        `| ${index + 1} | ${escapeTableCell(getPrimaryPathSection(page.finalUrl))} | ${page.textCharEstimate.toLocaleString("ja-JP")} | ${page.fileLinkCount.toLocaleString("ja-JP")} | ${formatTableLink(page.title || page.finalUrl, page.finalUrl, 42)} |`
    ),
  ];
}

function shortenTitle(value: string, maxChars: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function escapeTableCell(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function formatTableLink(label: string, url: string, maxChars: number) {
  return `[${escapeMarkdownLinkText(shortenTitle(label, maxChars))}](${url})`;
}

function buildWebsiteMapCommandLink(url: string) {
  const command = `Website Map: ${url}`;
  return buildCommandLink("サイトマップ取得", command);
}

function buildCommandLink(label: string, command: string) {
  return `[${escapeMarkdownLinkText(label)}](/__gpt-command?mode=run&text=${encodeURIComponent(command)})`;
}

function escapeMarkdownLinkText(value: string) {
  return escapeTableCell(value).replace(/\\/g, "\\\\").replace(/\]/g, "\\]");
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB (${bytes.toLocaleString("ja-JP")} bytes)`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB (${bytes.toLocaleString("ja-JP")} bytes)`;
  }
  return `${bytes.toLocaleString("ja-JP")} bytes`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

function countTextChars(value: string) {
  return Array.from(value || "").length;
}

function resolveWebsiteMapDocumentTitle({
  result,
  pageText,
}: {
  result: WebsiteMapResult;
  pageText?: WebsiteMapPageTextResult | null;
}) {
  const candidates = [
    pageText?.title,
    result.pages[0]?.title,
    result.pages[0]?.summary,
    result.host,
    result.rootUrl,
  ];

  for (const candidate of candidates) {
    const title = cleanWebsiteMapDocumentTitle(candidate || "");
    if (title) return title;
  }

  return "Site report";
}

function cleanWebsiteMapDocumentTitle(value: string) {
  const normalized = value
    .replace(/\s+/g, " ")
    .replace(/^Website\s*Map\s*:\s*/i, "")
    .trim();
  if (!normalized) return "";

  const withoutSiteSuffix = normalized
    .split(/\s+\|\s+/u)
    .filter((part) => part.trim())
    .filter((part) => !/^(NHKニュース|Yahoo!?ニュース|Google News)$/iu.test(part.trim()))
    .join(" | ")
    .trim();
  const withoutDashSuffix = withoutSiteSuffix
    .replace(/\s+-\s+Yahoo!?ニュース$/iu, "")
    .replace(/\s+-\s+NHKニュース$/iu, "")
    .trim();
  const cleaned = withoutDashSuffix || normalized;
  return cleaned.length > 80 ? `${cleaned.slice(0, 79).trimEnd()}...` : cleaned;
}

function safeFileBase(value: string) {
  return (
    value
      .replace(/^https?:\/\//i, "")
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "website-map"
  );
}
