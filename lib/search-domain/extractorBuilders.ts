type SearchResultLike = {
  title?: string;
  link?: string;
  snippet?: string;
};

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(
      /<\/(p|div|section|article|li|ul|ol|table|thead|tbody|tr|td|th|h1|h2|h3|h4|h5|h6|br)>/gi,
      "\n"
    )
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function htmlToLines(html: string): string[] {
  return stripHtml(html)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

const MAX_SNIPPET_LINES = 6;
const MAX_SNIPPET_CHARS = 1200;
const MAX_LINE_CHARS = 320;

const BOILERPLATE_LINE_PATTERNS = [
  /\bcookie(s)?\b/i,
  /\bprivacy policy\b/i,
  /\bterms of (use|service)\b/i,
  /\bsubscribe\b/i,
  /\bsign in\b/i,
  /\blog in\b/i,
  /\bnewsletter\b/i,
  /\badvertisement\b/i,
  /\bcustomer support\b/i,
  /\bdemo request\b/i,
  /\bbloomberg terminal\b/i,
  /\bapp store\b/i,
  /\bgoogle play\b/i,
];

function truncateLine(line: string) {
  if (line.length <= MAX_LINE_CHARS) return line;
  return `${line.slice(0, MAX_LINE_CHARS - 1).trimEnd()}...`;
}

function extractQueryTerms(query: string) {
  const normalized = query.toLowerCase();
  const terms = normalized
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

  for (const token of normalized.match(/[\u3040-\u30ff\u3400-\u9fff]{4,}/g) || []) {
    for (let index = 0; index <= token.length - 2; index += 1) {
      terms.push(token.slice(index, index + 2));
    }
  }

  return Array.from(new Set(terms));
}

function isLikelyBoilerplateLine(line: string) {
  return BOILERPLATE_LINE_PATTERNS.some((pattern) => pattern.test(line));
}

function trimSnippet(lines: string[]) {
  const output: string[] = [];
  let total = 0;

  for (const line of lines) {
    const next = truncateLine(line);
    const separatorLength = output.length === 0 ? 0 : 1;
    if (total + separatorLength + next.length > MAX_SNIPPET_CHARS) break;
    output.push(next);
    total += separatorLength + next.length;
  }

  return output.join("\n").trim();
}

export function scoreLine(line: string, query: string): number {
  const lower = line.toLowerCase();
  const tokens = extractQueryTerms(query);

  let score = 0;
  for (const token of tokens) {
    if (lower.includes(token)) score += 2;
  }
  if (score > 0 && line.length >= 40 && line.length <= MAX_LINE_CHARS) score += 1;
  if (isLikelyBoilerplateLine(line)) score -= 4;
  return score;
}

export function dedupeLines(lines: string[]) {
  const seen = new Set<string>();
  return lines.filter((line) => {
    const key = line.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildSnippetFromHtml(args: {
  html: string;
  query: string;
  fallbackSnippet?: string;
}) {
  const lines = htmlToLines(args.html);
  const selected = dedupeLines(
    lines
      .map((line) => ({ line, score: scoreLine(line, args.query) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.line)
  ).slice(0, MAX_SNIPPET_LINES);

  return trimSnippet(selected) || args.fallbackSnippet || "";
}

export function buildSearchResultSnippetSeed(item: Record<string, unknown>): SearchResultLike {
  return {
    title: typeof item.title === "string" ? item.title : "",
    link: typeof item.link === "string" ? item.link : "",
    snippet: typeof item.snippet === "string" ? item.snippet : "",
  };
}
