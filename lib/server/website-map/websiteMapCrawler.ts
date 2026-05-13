import type {
  WebsiteMapFile,
  WebsiteMapPage,
  WebsiteMapResult,
  WebsiteMapSkippedUrl,
} from "@/lib/app/website-map/websiteMapTypes";

const USER_AGENT =
  "Mozilla/5.0 (compatible; KinChatWebsiteMap/0.1; +https://example.invalid)";
const DEFAULT_TIMEOUT_MS = 12000;

type CrawlOptions = {
  maxDepth?: number;
  maxPages?: number;
  maxFiles?: number;
};

type LinkInfo = {
  url: string;
  label: string;
};

type RobotsRules = {
  disallow: string[];
};

export async function crawlWebsiteMap(
  rawUrl: string,
  options: CrawlOptions = {}
): Promise<WebsiteMapResult> {
  const root = resolveHttpUrl(rawUrl);
  const maxDepth = clampInteger(options.maxDepth, 2, 0, 4);
  const maxPages = clampInteger(options.maxPages, 50, 1, 200);
  const maxFiles = clampInteger(options.maxFiles, 20, 0, 100);
  const robots = await fetchRobotsRules(root).catch(() => ({ disallow: [] }));
  const queue: Array<{ url: string; depth: number }> = [
    { url: root.toString(), depth: 0 },
  ];
  const queued = new Set(queue.map((item) => item.url));
  const visited = new Set<string>();
  const pages: WebsiteMapPage[] = [];
  const files: WebsiteMapFile[] = [];
  const fileUrls = new Set<string>();
  const skipped: WebsiteMapSkippedUrl[] = [];
  let finalRootUrl = root.toString();

  while (queue.length > 0 && pages.length < maxPages) {
    const current = queue.shift();
    if (!current) break;
    const currentUrl = normalizeUrl(current.url);
    if (!currentUrl || visited.has(currentUrl)) continue;
    visited.add(currentUrl);

    const parsedUrl = new URL(currentUrl);
    if (!isSameHost(root, parsedUrl)) {
      skipped.push({ url: currentUrl, reason: "outside_host" });
      continue;
    }
    if (!isAllowedByRobots(parsedUrl, robots)) {
      skipped.push({ url: currentUrl, reason: "robots_disallow" });
      continue;
    }

    try {
      const response = await fetchWithTimeout(currentUrl);
      const finalUrl = response.url || currentUrl;
      if (pages.length === 0) finalRootUrl = finalUrl;
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.toLowerCase().includes("text/html")) {
        skipped.push({ url: currentUrl, reason: `non_html:${contentType || "unknown"}` });
        continue;
      }

      const html = await response.text();
      const links = extractLinks(html, finalUrl);
      const fileLinks = links.filter((link) => {
        try {
          return isSameHost(root, new URL(link.url)) && isLikelyFileUrl(link.url);
        } catch {
          return false;
        }
      });
      for (const file of fileLinks) {
        if (files.length >= maxFiles) break;
        const normalizedFileUrl = normalizeUrl(file.url);
        if (!normalizedFileUrl || fileUrls.has(normalizedFileUrl)) continue;
        fileUrls.add(normalizedFileUrl);
        files.push(await buildFileInfo(file, finalUrl));
      }

      const sameHostLinks = links.filter((link) => {
        try {
          return isSameHost(root, new URL(link.url)) && !isLikelyFileUrl(link.url);
        } catch {
          return false;
        }
      });

      const text = extractVisibleText(html);
      pages.push({
        url: currentUrl,
        finalUrl,
        title: extractTitle(html) || finalUrl,
        depth: current.depth,
        status: response.status,
        contentType,
        textCharEstimate: text.length,
        linkCount: links.length,
        sameHostLinkCount: sameHostLinks.length,
        fileLinkCount: fileLinks.length,
        summary: clipText(text, 260),
      });

      if (current.depth >= maxDepth) continue;
      for (const link of sameHostLinks) {
        const nextUrl = normalizeUrl(link.url);
        if (!nextUrl || queued.has(nextUrl) || visited.has(nextUrl)) continue;
        queue.push({ url: nextUrl, depth: current.depth + 1 });
        queued.add(nextUrl);
      }
    } catch (error) {
      skipped.push({
        url: currentUrl,
        reason: error instanceof Error ? error.message : "fetch_failed",
      });
    }
  }

  return {
    version: "0.1-website-map",
    rootUrl: root.toString(),
    finalRootUrl,
    host: root.host,
    crawledAt: new Date().toISOString(),
    maxDepth,
    maxPages,
    maxFiles,
    pages,
    files,
    skipped,
  };
}

export function resolveHttpUrl(rawUrl: string) {
  const value = rawUrl.trim();
  if (!value) throw new Error("URL is required.");
  const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are supported.");
  }
  url.hash = "";
  return url;
}

function clampInteger(value: unknown, fallback: number, min: number, max: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(number)));
}

async function fetchWithTimeout(url: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      redirect: "follow",
      cache: "no-store",
      headers: {
        "User-Agent": USER_AGENT,
        ...(init.headers || {}),
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchRobotsRules(root: URL): Promise<RobotsRules> {
  const robotsUrl = new URL("/robots.txt", root);
  const response = await fetchWithTimeout(robotsUrl.toString());
  if (!response.ok) return { disallow: [] };
  return parseRobotsTxt(await response.text());
}

export function parseRobotsTxt(text: string): RobotsRules {
  const disallow: string[] = [];
  let applies = false;
  for (const line of text.split(/\r?\n/)) {
    const cleaned = line.replace(/#.*/, "").trim();
    if (!cleaned) continue;
    const [rawKey, ...rest] = cleaned.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      applies = value === "*" || /KinChatWebsiteMap/i.test(value);
      continue;
    }
    if (applies && key === "disallow" && value) {
      disallow.push(value);
    }
  }
  return { disallow };
}

function isAllowedByRobots(url: URL, rules: RobotsRules) {
  return !rules.disallow.some(
    (path) => path === "/" || url.pathname.startsWith(path)
  );
}

function isSameHost(root: URL, candidate: URL) {
  return root.host.toLowerCase() === candidate.host.toLowerCase();
}

function normalizeUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    if (url.pathname !== "/") {
      url.pathname = url.pathname.replace(/\/+$/g, "") || "/";
    }
    return url.toString();
  } catch {
    return "";
  }
}

export function extractLinks(html: string, baseUrl: string): LinkInfo[] {
  const links: LinkInfo[] = [];
  const anchorPattern = /<a\b[^>]*href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/giu;
  for (const match of html.matchAll(anchorPattern)) {
    const href = (match[1] || match[2] || match[3] || "").trim();
    if (!href || href.startsWith("#") || /^(mailto|tel|javascript):/i.test(href)) {
      continue;
    }
    try {
      const url = new URL(decodeHtmlEntities(href), baseUrl);
      if (url.protocol !== "http:" && url.protocol !== "https:") continue;
      url.hash = "";
      links.push({
        url: url.toString(),
        label: clipText(extractVisibleText(match[4] || ""), 120) || url.toString(),
      });
    } catch {}
  }
  return dedupeLinks(links);
}

function dedupeLinks(links: LinkInfo[]) {
  const seen = new Set<string>();
  const result: LinkInfo[] = [];
  for (const link of links) {
    const key = normalizeUrl(link.url);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push({ ...link, url: key });
  }
  return result;
}

function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/iu);
  return match ? decodeHtmlEntities(match[1]).replace(/\s+/g, " ").trim() : "";
}

export function extractVisibleText(html: string) {
  return decodeHtmlEntities(
    html
      .replace(/<script\b[\s\S]*?<\/script>/giu, " ")
      .replace(/<style\b[\s\S]*?<\/style>/giu, " ")
      .replace(/<noscript\b[\s\S]*?<\/noscript>/giu, " ")
      .replace(/<[^>]+>/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function isLikelyFileUrl(url: string) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return /\.(pdf|docx?|xlsx?|pptx?|csv|zip)$/i.test(pathname);
  } catch {
    return false;
  }
}

async function buildFileInfo(link: LinkInfo, sourcePageUrl: string): Promise<WebsiteMapFile> {
  try {
    const response = await fetchWithTimeout(link.url, { method: "HEAD" });
    const contentType = response.headers.get("content-type") || "";
    const contentLength = Number(response.headers.get("content-length") || "");
    return {
      url: link.url,
      sourcePageUrl,
      label: link.label,
      kind: /\.pdf(?:$|\?)/i.test(link.url) || contentType.includes("pdf")
        ? "pdf"
        : "file",
      contentType,
      contentLength: Number.isFinite(contentLength) ? contentLength : undefined,
      status: response.status,
    };
  } catch {
    return {
      url: link.url,
      sourcePageUrl,
      label: link.label,
      kind: /\.pdf(?:$|\?)/i.test(link.url) ? "pdf" : "file",
    };
  }
}

function clipText(text: string, limit: number) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > limit
    ? `${normalized.slice(0, Math.max(0, limit - 3)).trimEnd()}...`
    : normalized;
}
