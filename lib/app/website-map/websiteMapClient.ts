import type {
  WebsiteMapRequest,
  WebsiteMapResult,
} from "@/lib/app/website-map/websiteMapTypes";

type WebsiteMapApiResponse = Partial<WebsiteMapResult> & {
  ok?: boolean;
  error?: string;
};

export async function fetchWebsiteMap(
  request: WebsiteMapRequest
): Promise<WebsiteMapResult> {
  const response = await fetch("/api/website-map", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
  const data = (await response.json().catch(() => ({}))) as WebsiteMapApiResponse;
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || response.statusText || "Website map failed.");
  }
  return normalizeWebsiteMapResult(data);
}

function normalizeWebsiteMapResult(data: WebsiteMapApiResponse): WebsiteMapResult {
  return {
    version: "0.1-website-map",
    rootUrl: data.rootUrl || "",
    finalRootUrl: data.finalRootUrl || data.rootUrl || "",
    host: data.host || "",
    crawledAt: data.crawledAt || new Date().toISOString(),
    maxDepth: data.maxDepth || 2,
    maxPages: data.maxPages || 50,
    maxFiles: data.maxFiles || 20,
    pages: Array.isArray(data.pages) ? data.pages : [],
    files: Array.isArray(data.files) ? data.files : [],
    skipped: Array.isArray(data.skipped) ? data.skipped : [],
  };
}

export function buildWebsiteMapDocument(result: WebsiteMapResult) {
  const title = `Website Map: ${result.host || result.rootUrl}`;
  const text = formatWebsiteMapText(result);
  return {
    title,
    filename: `${safeFileBase(result.host || "website-map")}.website-map.md`,
    text,
    summary: [
      `${result.pages.length} pages mapped`,
      `${result.files.length} linked files detected`,
      `depth ${result.maxDepth}`,
    ].join(" / "),
    structuredPayload: result,
    timestamp: result.crawledAt,
  };
}

export function formatWebsiteMapText(result: WebsiteMapResult) {
  const lines = [
    `# Website Map: ${result.host || result.rootUrl}`,
    "",
    `Root URL: ${result.rootUrl}`,
    `Final root URL: ${result.finalRootUrl}`,
    `Crawled at: ${result.crawledAt}`,
    `Limits: depth ${result.maxDepth}, pages ${result.maxPages}, files ${result.maxFiles}`,
    "",
    `## Overview`,
    "",
    `- Pages mapped: ${result.pages.length}`,
    `- Linked files detected: ${result.files.length}`,
    `- Skipped URLs: ${result.skipped.length}`,
    "",
    "## Pages",
    "",
    ...result.pages.flatMap((page, index) => [
      `### ${index + 1}. ${page.title || page.finalUrl}`,
      "",
      `- URL: ${page.finalUrl}`,
      `- Depth: ${page.depth}`,
      `- Status: ${page.status}`,
      `- Estimated text: ${page.textCharEstimate.toLocaleString("ja-JP")} chars`,
      `- Links: ${page.sameHostLinkCount}/${page.linkCount} same-host, ${page.fileLinkCount} files`,
      page.summary ? `- Preview: ${page.summary}` : "",
      "",
    ]),
    "## Linked Files",
    "",
    ...(result.files.length
      ? result.files.flatMap((file, index) => [
          `### ${index + 1}. ${file.label || file.url}`,
          "",
          `- URL: ${file.url}`,
          `- Type: ${file.kind}`,
          `- Source page: ${file.sourcePageUrl}`,
          file.contentType ? `- Content-Type: ${file.contentType}` : "",
          typeof file.contentLength === "number"
            ? `- Size: ${file.contentLength.toLocaleString("ja-JP")} bytes`
            : "",
          typeof file.status === "number" ? `- Status: ${file.status}` : "",
          "",
        ])
      : ["No linked files detected.", ""]),
    "## Skipped",
    "",
    ...(result.skipped.length
      ? result.skipped.map((item) => `- ${item.url}: ${item.reason}`)
      : ["No skipped URLs."]),
  ];
  return lines.filter((line) => line !== "").join("\n");
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
