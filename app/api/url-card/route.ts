import { NextResponse } from "next/server";
import type { SourceItem } from "@/types/chat";

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

function getHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function isGoogleMapsLink(url: string) {
  const normalized = url.toLowerCase();
  return normalized.includes("google.com/maps") || normalized.includes("maps.google");
}

function extractYoutubeVideoId(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();
    if (host.includes("youtu.be")) {
      return url.pathname.replace(/^\/+/, "").split("/")[0] || "";
    }
    if (host.includes("youtube.com")) {
      if (url.pathname === "/watch") {
        return url.searchParams.get("v")?.trim() || "";
      }
      const pathParts = url.pathname.split("/").filter(Boolean);
      const markerIndex = pathParts.findIndex((part) =>
        ["embed", "shorts", "live"].includes(part)
      );
      if (markerIndex >= 0) {
        return pathParts[markerIndex + 1] || "";
      }
    }
  } catch {}

  return "";
}

async function resolveGenericSource(url: string): Promise<SourceItem> {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; KinChatPreview/1.0; +https://example.invalid)",
    },
    cache: "no-store",
  });

  const finalUrl = response.url || url;
  const html = await response.text();
  const title = extractTitle(html) || finalUrl;
  const description = extractMetaTag(html, [
    "og:description",
    "twitter:description",
    "description",
  ]);
  const image = extractMetaTag(html, ["og:image", "twitter:image"]);
  const siteName = extractMetaTag(html, ["og:site_name"]) || getHostname(finalUrl);

  return {
    title,
    link: finalUrl,
    snippet: description || siteName,
    sourceType: "url_card",
    thumbnailUrl: image || undefined,
  };
}

async function resolveYoutubeSource(url: string, videoId: string): Promise<SourceItem> {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  let title = "YouTube Video";
  let channelName = "YouTube";

  try {
    const response = await fetch(oembedUrl, { cache: "no-store" });
    if (response.ok) {
      const data = (await response.json()) as {
        title?: string;
        author_name?: string;
      };
      title = data.title?.trim() || title;
      channelName = data.author_name?.trim() || channelName;
    }
  } catch {}

  return {
    title,
    link: url,
    sourceType: "youtube_video",
    videoId,
    channelName,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    snippet: "YouTube video",
  };
}

function resolveMapsSource(url: string): SourceItem {
  let title = "Google Maps";
  try {
    const parsed = new URL(url);
    const query =
      parsed.searchParams.get("query") ||
      parsed.searchParams.get("destination") ||
      parsed.searchParams.get("q");
    if (query?.trim()) {
      title = decodeURIComponent(query).replace(/\+/g, " ").trim();
    }
  } catch {}

  return {
    title,
    link: url,
    sourceType: "google_maps",
    snippet: "Open in Google Maps",
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawUrl = (searchParams.get("url") || "").trim();

  if (!rawUrl) {
    return NextResponse.json({ error: "url missing" }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  if (!/^https?:$/i.test(parsedUrl.protocol)) {
    return NextResponse.json({ error: "unsupported protocol" }, { status: 400 });
  }

  try {
    const videoId = extractYoutubeVideoId(parsedUrl.toString());
    const source = videoId
      ? await resolveYoutubeSource(parsedUrl.toString(), videoId)
      : isGoogleMapsLink(parsedUrl.toString())
        ? resolveMapsSource(parsedUrl.toString())
        : await resolveGenericSource(parsedUrl.toString());

    return NextResponse.json({ ok: true, source });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "url card resolve failed",
      },
      { status: 500 }
    );
  }
}
