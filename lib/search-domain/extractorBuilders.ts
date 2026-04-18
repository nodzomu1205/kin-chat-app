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

export function scoreLine(line: string, query: string): number {
  const lower = line.toLowerCase();
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

  let score = 0;
  for (const token of tokens) {
    if (lower.includes(token)) score += 2;
  }
  if (line.length >= 40 && line.length <= 260) score += 1;
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
  ).slice(0, 6);

  return selected.join("\n").trim() || args.fallbackSnippet || "";
}

export function buildSearchResultSnippetSeed(item: Record<string, unknown>): SearchResultLike {
  return {
    title: typeof item.title === "string" ? item.title : "",
    link: typeof item.link === "string" ? item.link : "",
    snippet: typeof item.snippet === "string" ? item.snippet : "",
  };
}
