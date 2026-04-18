import {
  buildSnippetFromHtml,
} from "@/lib/search-domain/extractorBuilders";

export async function fetchPageSnippet(
  result: { title?: string; link?: string; snippet?: string },
  query: string
): Promise<string> {
  if (!result.link) return result.snippet || "";

  try {
    const response = await fetch(result.link, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.includes("text/html")) {
      return result.snippet || "";
    }

    const html = await response.text();
    return buildSnippetFromHtml({
      html,
      query,
      fallbackSnippet: result.snippet,
    });
  } catch {
    return result.snippet || "";
  }
}
