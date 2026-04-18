import type { SourceItem } from "@/types/chat";
import {
  extractMetaTag,
  extractTitle,
  getHostname,
} from "@/lib/server/webPreview/htmlMetadata";

export function isGoogleMapsLink(url: string) {
  const normalized = url.toLowerCase();
  return (
    normalized.includes("google.com/maps") || normalized.includes("maps.google")
  );
}

export function extractYoutubeVideoId(rawUrl: string) {
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

export function buildGenericUrlCardSource(args: {
  url: string;
  finalUrl: string;
  html: string;
}): SourceItem {
  const title = extractTitle(args.html) || args.finalUrl;
  const description = extractMetaTag(args.html, [
    "og:description",
    "twitter:description",
    "description",
  ]);
  const image = extractMetaTag(args.html, ["og:image", "twitter:image"]);
  const siteName =
    extractMetaTag(args.html, ["og:site_name"]) || getHostname(args.finalUrl);

  return {
    title,
    link: args.finalUrl,
    snippet: description || siteName,
    sourceType: "url_card",
    thumbnailUrl: image || undefined,
  };
}

export function buildYoutubeUrlCardSource(args: {
  url: string;
  videoId: string;
  title?: string;
  channelName?: string;
}): SourceItem {
  return {
    title: args.title?.trim() || "YouTube Video",
    link: args.url,
    sourceType: "youtube_video",
    videoId: args.videoId,
    channelName: args.channelName?.trim() || "YouTube",
    thumbnailUrl: `https://i.ytimg.com/vi/${args.videoId}/hqdefault.jpg`,
    snippet: "YouTube video",
  };
}

export function buildMapsUrlCardSource(url: string): SourceItem {
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
