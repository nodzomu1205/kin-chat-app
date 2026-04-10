import { NextResponse } from "next/server";

function extractMetaTag(html: string, keys: string[]) {
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

function extractTitle(html: string) {
  const ogTitle = extractMetaTag(html, ["og:title", "twitter:title"]);
  if (ogTitle) return ogTitle;

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return titleMatch?.[1]?.replace(/\s+/g, " ").trim() || "";
}

function resolveUrlMaybeRelative(value: string, baseUrl: string) {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawUrl = searchParams.get("url") || "";

  if (!rawUrl) {
    return NextResponse.json({ error: "url missing" }, { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  if (!/^https?:$/i.test(targetUrl.protocol)) {
    return NextResponse.json({ error: "unsupported protocol" }, { status: 400 });
  }

  try {
    const response = await fetch(targetUrl.toString(), {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; KinChatPreview/1.0; +https://example.invalid)",
      },
      cache: "no-store",
    });

    const finalUrl = response.url || targetUrl.toString();
    const contentType = response.headers.get("content-type") || "";
    const html = await response.text();

    const title = extractTitle(html);
    const description = extractMetaTag(html, [
      "og:description",
      "twitter:description",
      "description",
    ]);
    const image = extractMetaTag(html, ["og:image", "twitter:image"]);
    const type = extractMetaTag(html, ["og:type"]);
    const publishedTime = extractMetaTag(html, [
      "article:published_time",
      "og:published_time",
      "publication_date",
      "date",
    ]);
    const siteName = extractMetaTag(html, ["og:site_name"]) || new URL(finalUrl).hostname;

    return NextResponse.json({
      ok: true,
      url: finalUrl,
      siteName,
      title: title || finalUrl,
      description,
      image: image ? resolveUrlMaybeRelative(image, finalUrl) : "",
      type,
      publishedTime,
      contentType,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        url: targetUrl.toString(),
        siteName: targetUrl.hostname,
        title: targetUrl.toString(),
        description: "",
        image: "",
        type: "",
        publishedTime: "",
        error: error instanceof Error ? error.message : "preview fetch failed",
      },
      { status: 200 }
    );
  }
}
