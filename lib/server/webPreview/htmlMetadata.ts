export function extractMetaTag(html: string, keys: string[]) {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
        "i"
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`,
        "i"
      ),
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]?.trim()) {
        return match[1].trim();
      }
    }
  }

  return "";
}

export function extractTitle(html: string) {
  const ogTitle = extractMetaTag(html, ["og:title", "twitter:title"]);
  if (ogTitle) return ogTitle;

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return titleMatch?.[1]?.replace(/\s+/g, " ").trim() || "";
}

export function resolveUrlMaybeRelative(value: string, baseUrl: string) {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

export function getHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function resolveHttpUrl(rawUrl: string) {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { ok: false as const, error: "url missing" };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmed);
  } catch {
    return { ok: false as const, error: "invalid url" };
  }

  if (!/^https?:$/i.test(parsedUrl.protocol)) {
    return { ok: false as const, error: "unsupported protocol" };
  }

  return {
    ok: true as const,
    url: parsedUrl,
  };
}
