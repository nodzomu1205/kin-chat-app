import type {
  WebsiteMapFile,
  WebsiteMapPage,
  WebsiteMapPageTextResult,
  WebsiteMapResult,
  WebsiteMapSkippedUrl,
} from "@/lib/app/website-map/websiteMapTypes";

const USER_AGENT =
  "Mozilla/5.0 (compatible; KinChatWebsiteMap/0.1; +https://example.invalid)";
const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_CRAWL_TIME_BUDGET_MS = 45000;

type CrawlOptions = {
  maxDepth?: number;
  maxPages?: number | null;
  maxFiles?: number | null;
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
  const maxPages = resolveOptionalLimit(options.maxPages);
  const maxFiles = resolveOptionalLimit(options.maxFiles);
  const startedAt = Date.now();
  const deadline = startedAt + DEFAULT_CRAWL_TIME_BUDGET_MS;
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
  let timedOut = false;

  while (queue.length > 0 && (maxPages === null || pages.length < maxPages)) {
    if (Date.now() >= deadline) {
      timedOut = true;
      skipped.push({
        url: queue[0]?.url || root.toString(),
        reason: "crawl_time_budget_exceeded",
      });
      break;
    }
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
        if (maxFiles !== null && files.length >= maxFiles) break;
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

      const pageContent = extractPageContent(html, finalUrl);
      pages.push({
        url: currentUrl,
        finalUrl,
        title: extractTitle(html) || finalUrl,
        depth: current.depth,
        status: response.status,
        contentType,
        textCharEstimate: pageContent.text.length,
        linkCount: links.length,
        sameHostLinkCount: sameHostLinks.length,
        fileLinkCount: fileLinks.length,
        sameHostLinks,
        fileLinks,
        summary: clipText(pageContent.text, 260),
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
    timedOut,
    timeBudgetMs: DEFAULT_CRAWL_TIME_BUDGET_MS,
    pages,
    files,
    skipped,
  };
}

export async function fetchWebsiteMapPageText(
  rawUrl: string
): Promise<WebsiteMapPageTextResult> {
  const url = resolveHttpUrl(rawUrl);
  const response = await fetchWithTimeout(url.toString());
  const finalUrl = response.url || url.toString();
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("text/html")) {
    throw new Error(`This URL is not an HTML page: ${contentType || "unknown"}`);
  }
  const html = await response.text();
  const pageContent = extractPageContent(html, finalUrl);
  return {
    url: url.toString(),
    finalUrl,
    title: extractTitle(html) || finalUrl,
    contentType,
    status: response.status,
    text: pageContent.text,
    textCharEstimate: pageContent.text.length,
    images: pageContent.images,
    fetchedAt: new Date().toISOString(),
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

function resolveOptionalLimit(value: unknown) {
  if (value === null || typeof value === "undefined") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.floor(number));
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

export function extractPageContent(html: string, baseUrl: string) {
  const candidates = collectContentCandidates(html);
  const bestHtml = selectBestContentHtml(candidates);
  const cleanedHtml = chooseReadableContentHtml(bestHtml, html);
  const scopedImages = extractContentImages(cleanedHtml, baseUrl);
  return {
    text: extractVisibleText(cleanedHtml),
    images: scopedImages.length ? scopedImages : extractContentImages(html, baseUrl),
  };
}

function chooseReadableContentHtml(bestHtml: string, fullHtml: string) {
  const cleanedBest = stripBoilerplateBlocks(bestHtml);
  const cleanedFull = stripBoilerplateBlocks(fullHtml);
  const bestText = extractVisibleText(cleanedBest);
  const fullText = extractVisibleText(cleanedFull);

  if (
    bestText.length < 500 &&
    fullText.length > Math.max(900, bestText.length * 3)
  ) {
    return cleanedFull;
  }

  if (
    bestText.length < 1200 &&
    fullText.length > bestText.length * 5 &&
    containsMainContentSignals(fullText)
  ) {
    return cleanedFull;
  }

  return cleanedBest;
}

function containsMainContentSignals(text: string) {
  return /(?:事業概要|主なプロジェクト|ビジネス分野|関連リリース|財務指標|業績|会社概要|サステナビリティ)/u.test(
    text
  );
}

function collectContentCandidates(html: string) {
  const candidates = [html];
  const patterns = [
    /<main\b[^>]*>[\s\S]*?<\/main>/giu,
    /<article\b[^>]*>[\s\S]*?<\/article>/giu,
    /<(?:div|section)\b[^>]*(?:id|class)\s*=\s*(?:"[^"]*(?:main|content|contents|article|body|primary)[^"]*"|'[^']*(?:main|content|contents|article|body|primary)[^']*')[^>]*>[\s\S]*?<\/(?:div|section)>/giu,
  ];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      if (match[0]) candidates.push(match[0]);
    }
  }
  return candidates;
}

function selectBestContentHtml(candidates: string[]) {
  const fullDocument = candidates[0] || "";
  let best = stripBoilerplateBlocks(fullDocument);
  let bestScore = scoreContentCandidate(best);
  for (const candidate of candidates.slice(1)) {
    const text = extractVisibleText(stripBoilerplateBlocks(candidate));
    if (!isUsefulContentText(text)) continue;
    const score = scoreContentCandidate(candidate);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

function isUsefulContentText(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length < 80) return false;
  if (/^(?:main|menu|search|close|skip)$/iu.test(normalized)) return false;
  return true;
}

function scoreContentCandidate(html: string) {
  const cleaned = stripBoilerplateBlocks(html);
  const text = extractVisibleText(cleaned);
  const punctuationScore = (text.match(/[。、，,.。]/gu) || []).length * 20;
  const paragraphScore =
    (cleaned.match(/<(?:p|li|td|th|h[1-6])\b/giu) || []).length * 35;
  const boilerplatePenalty =
    (cleaned.match(/(?:nav|menu|footer|header|breadcrumb|search|social)/giu) || [])
      .length * 80;
  return text.length + punctuationScore + paragraphScore - boilerplatePenalty;
}

function stripBoilerplateBlocks(html: string) {
  let current = html
    .replace(/<script\b[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[\s\S]*?<\/style>/giu, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/giu, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/giu, " ");
  const blockTags = ["header", "nav", "footer", "aside", "form"];
  for (const tag of blockTags) {
    current = current.replace(
      new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, "giu"),
      " "
    );
  }
  current = current.replace(
    /<(?:div|section|ul|ol)\b[^>]*(?:id|class|role)\s*=\s*(?:"[^"]*(?:nav|menu|footer|header|breadcrumb|search|social|sns|modal|drawer|localnav|side)[^"]*"|'[^']*(?:nav|menu|footer|header|breadcrumb|search|social|sns|modal|drawer|localnav|side)[^']*')[^>]*>[\s\S]*?<\/(?:div|section|ul|ol)>/giu,
    " "
  );
  return current;
}

function extractContentImages(html: string, baseUrl: string) {
  const images: Array<{ url: string; alt: string; width?: number; height?: number }> = [];
  const seen = new Set<string>();
  const imagePattern = /<img\b([^>]*)>/giu;
  for (const match of html.matchAll(imagePattern)) {
    const attrs = parseHtmlAttributes(match[1] || "");
    const rawSrc =
      attrs.src ||
      attrs["data-src"] ||
      attrs["data-original"] ||
      attrs["data-lazy-src"] ||
      pickFirstSrcsetUrl(attrs.srcset || attrs["data-srcset"] || "") ||
      "";
    addImageCandidate({
      images,
      seen,
      rawUrl: rawSrc,
      baseUrl,
      alt: attrs.alt || "",
      width: attrs.width,
      height: attrs.height,
    });
  }

  const sourcePattern = /<source\b([^>]*)>/giu;
  for (const match of html.matchAll(sourcePattern)) {
    const attrs = parseHtmlAttributes(match[1] || "");
    addImageCandidate({
      images,
      seen,
      rawUrl: pickFirstSrcsetUrl(attrs.srcset || attrs["data-srcset"] || ""),
      baseUrl,
      alt: attrs.alt || "",
    });
  }

  const backgroundPattern = /(?:background-image\s*:\s*url\(|data-bg\s*=\s*|data-background\s*=\s*)(?:"([^"]+)"|'([^']+)'|([^)"'\s]+))/giu;
  for (const match of html.matchAll(backgroundPattern)) {
    addImageCandidate({
      images,
      seen,
      rawUrl: match[1] || match[2] || match[3] || "",
      baseUrl,
      alt: "",
    });
  }
  return images.slice(0, 30);
}

function addImageCandidate(args: {
  images: Array<{ url: string; alt: string; width?: number; height?: number }>;
  seen: Set<string>;
  rawUrl: string;
  baseUrl: string;
  alt: string;
  width?: string;
  height?: string;
}) {
  const rawUrl = args.rawUrl.trim();
  if (!rawUrl || rawUrl.startsWith("data:")) return;
  try {
    const url = new URL(decodeHtmlEntities(rawUrl), args.baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return;
    const key = url.toString();
    if (args.seen.has(key) || isLikelyDecorativeImage(key, args.alt)) return;
    args.seen.add(key);
    const width = parseOptionalDimension(args.width);
    const height = parseOptionalDimension(args.height);
    args.images.push({
      url: key,
      alt: decodeHtmlEntities(args.alt || "").replace(/\s+/g, " ").trim(),
      ...(typeof width === "number" ? { width } : {}),
      ...(typeof height === "number" ? { height } : {}),
    });
  } catch {}
}

function pickFirstSrcsetUrl(value: string) {
  const first = value.split(",")[0]?.trim() || "";
  return first.split(/\s+/)[0] || "";
}

function parseHtmlAttributes(value: string) {
  const attrs: Record<string, string> = {};
  const attrPattern = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gu;
  for (const match of value.matchAll(attrPattern)) {
    attrs[match[1].toLowerCase()] = match[2] || match[3] || match[4] || "";
  }
  return attrs;
}

function parseOptionalDimension(value?: string) {
  if (!value) return undefined;
  const number = Number(value.replace(/px$/iu, ""));
  return Number.isFinite(number) && number > 0 ? Math.round(number) : undefined;
}

function isLikelyDecorativeImage(url: string, alt: string) {
  const lower = `${url} ${alt}`.toLowerCase();
  return (
    /\.(?:svg|ico)(?:$|\?)/iu.test(url) ||
    /(?:logo|icon|sprite|blank|spacer|arrow|btn_|button|sns|social)/iu.test(lower)
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
