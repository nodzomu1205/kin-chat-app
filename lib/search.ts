// /lib/search.ts

export type SearchResponse = {
  text: string;
  sources: {
    title: string;
    link: string;
  }[];
};

type SerpOrganicResult = {
  title?: string;
  link?: string;
  snippet?: string;
};

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|section|article|li|ul|ol|table|thead|tbody|tr|td|th|h1|h2|h3|h4|h5|h6|br)>/gi, "\n")
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

function htmlToLines(html: string): string[] {
  const text = stripHtml(html);
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function scoreLine(line: string, query: string): number {
  const lower = line.toLowerCase();
  const q = query.toLowerCase();

  let score = 0;

  const queryTokens = q
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  for (const token of queryTokens) {
    if (lower.includes(token)) score += 2;
  }

  if (lower.includes("accepted file types")) score += 8;
  if (lower.includes("full list of accepted file types")) score += 8;
  if (lower.includes("supported")) score += 3;
  if (lower.includes("support")) score += 2;
  if (lower.includes("file type")) score += 4;
  if (lower.includes("mime")) score += 3;
  if (/\.(pdf|csv|xls|xlsx|ppt|pptx|doc|docx|txt|md|json|xml|html|png|jpg|jpeg|gif|webp)\b/i.test(line)) {
    score += 6;
  }
  if (line.length >= 20 && line.length <= 220) score += 1;

  return score;
}

function dedupeLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const line of lines) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }

  return out;
}

function pickEvidenceLines(lines: string[], query: string, maxLines = 18): string[] {
  const scored = lines
    .map((line) => ({ line, score: scoreLine(line, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const picked = dedupeLines(scored.map((item) => item.line)).slice(0, maxLines);
  return picked;
}

function summarizeFetchedPage(params: {
  title: string;
  link: string;
  snippet?: string;
  html: string;
  query: string;
}): string {
  const { title, link, snippet, html, query } = params;
  const lines = htmlToLines(html);
  const evidenceLines = pickEvidenceLines(lines, query);

  const parts: string[] = [];

  parts.push(`Source Title: ${title}`);
  parts.push(`Source URL: ${link}`);

  if (snippet) {
    parts.push(`Search Snippet: ${snippet}`);
  }

  if (evidenceLines.length > 0) {
    parts.push("Evidence:");
    for (const line of evidenceLines) {
      parts.push(`- ${line}`);
    }
  } else {
    const fallback = lines.slice(0, 8);
    if (fallback.length > 0) {
      parts.push("Fallback Extract:");
      for (const line of fallback) {
        parts.push(`- ${line}`);
      }
    }
  }

  return parts.join("\n");
}

function isOfficialPreferred(link: string): boolean {
  try {
    const url = new URL(link);
    const host = url.hostname.toLowerCase();

    return (
      host.includes("openai.com") ||
      host.includes("developers.openai.com") ||
      host.includes("platform.openai.com")
    );
  } catch {
    return false;
  }
}

async function fetchPageExtract(
  result: SerpOrganicResult,
  query: string
): Promise<string> {
  const title = result.title || "No title";
  const link = result.link || "";
  const snippet = result.snippet || "";

  if (!link) {
    return [
      `Source Title: ${title}`,
      "Evidence:",
      snippet ? `- ${snippet}` : "- No extract available",
    ].join("\n");
  }

  try {
    const res = await fetch(link, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") || "";

    if (!res.ok || !contentType.includes("text/html")) {
      return [
        `Source Title: ${title}`,
        `Source URL: ${link}`,
        "Evidence:",
        snippet ? `- ${snippet}` : "- Could not fetch HTML content",
      ].join("\n");
    }

    const html = await res.text();

    return summarizeFetchedPage({
      title,
      link,
      snippet,
      html,
      query,
    });
  } catch {
    return [
      `Source Title: ${title}`,
      `Source URL: ${link}`,
      "Evidence:",
      snippet ? `- ${snippet}` : "- Failed to fetch source body",
    ].join("\n");
  }
}

// 🔍 SerpAPI検索（本文・表・箇条書き優先抽出版）
export async function searchGoogle(query: string): Promise<SearchResponse> {
  try {
    const apiKey = process.env.SERP_API_KEY;

    if (!apiKey) {
      throw new Error("SERP_API_KEY is not set");
    }

    console.log("🔍 SEARCH QUERY:", query);

    const serpRes = await fetch(
      `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&num=5&api_key=${apiKey}`,
      { cache: "no-store" }
    );

    if (!serpRes.ok) {
      throw new Error("SerpAPI request failed");
    }

    const data = await serpRes.json();
    const rawResults: SerpOrganicResult[] = Array.isArray(data?.organic_results)
      ? data.organic_results
      : [];

    const sortedResults = [...rawResults]
      .filter((r) => r.link)
      .sort((a, b) => {
        const aOfficial = isOfficialPreferred(a.link || "") ? 1 : 0;
        const bOfficial = isOfficialPreferred(b.link || "") ? 1 : 0;
        return bOfficial - aOfficial;
      })
      .slice(0, 3);

    const extracts = await Promise.all(
      sortedResults.map((result) => fetchPageExtract(result, query))
    );

    const finalText = [
      `Search Query: ${query}`,
      "",
      "Use the following source-grounded evidence first.",
      "If a source explicitly lists support in a table or list, treat that as authoritative.",
      "",
      ...extracts.map((extract, idx) => `=== SOURCE ${idx + 1} ===\n${extract}`),
    ].join("\n\n");

    return {
      text: finalText,
      sources: sortedResults.map((r) => ({
        title: r.title || "No title",
        link: r.link || "",
      })),
    };
  } catch (error) {
    console.error("Search error:", error);

    return {
      text: "",
      sources: [],
    };
  }
}