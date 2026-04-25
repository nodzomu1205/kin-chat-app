import type React from "react";
import { MESSAGE_SOURCES_TEXT } from "@/components/message/messageText";
import type { SourceItem } from "@/types/chat";
import type { LinkPreview } from "./messageSourcePreviewTypes";

export function previewCardStyle(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: 8,
    padding: "10px 12px",
    borderRadius: 12,
    background: "#f8fafc",
    border: "1px solid #dbe4e8",
    textDecoration: "none",
  };
}

export function getHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function isGoogleMapsLink(url: string) {
  const normalized = url.toLowerCase();
  return normalized.includes("google.com/maps") || normalized.includes("maps.google");
}

export function isYoutubeLink(source: SourceItem) {
  const normalized = source.link.toLowerCase();
  return (
    normalized.includes("youtube.com/watch") ||
    normalized.includes("youtu.be/") ||
    source.sourceType === "youtube_video" ||
    !!source.videoId
  );
}

export function extractYoutubeEmbedId(source: SourceItem) {
  if (source.videoId?.trim()) return source.videoId.trim();

  try {
    const url = new URL(source.link);
    const host = url.hostname.toLowerCase();
    if (host.includes("youtu.be")) {
      return url.pathname.replace(/^\/+/, "").split("/")[0] || "";
    }
    if (host.includes("youtube.com")) {
      const watchId = url.searchParams.get("v");
      if (watchId?.trim()) return watchId.trim();
      const segments = url.pathname.split("/").filter(Boolean);
      const markerIndex = segments.findIndex((segment) =>
        ["embed", "shorts", "live"].includes(segment)
      );
      if (markerIndex >= 0 && segments[markerIndex + 1]) {
        return segments[markerIndex + 1];
      }
    }
  } catch {}

  return "";
}

export function getPreviewLabel(link: string) {
  const hostname = getHostname(link).toLowerCase();
  if (hostname.includes("google.") && hostname.includes("maps")) {
    return "Google Maps";
  }
  if (hostname.includes("youtube.") || hostname.includes("youtu.be")) {
    return "YouTube";
  }
  if (hostname.includes("google.")) {
    return "Google";
  }
  return getHostname(link);
}

function decodeMaybe(value: string) {
  try {
    return decodeURIComponent(value).replace(/\+/g, " ");
  } catch {
    return value;
  }
}

export function extractGoogleMapsSubtitle(source: SourceItem) {
  try {
    const url = new URL(source.link);
    const query = url.searchParams.get("query");
    if (query?.trim()) return decodeMaybe(query).trim();

    const destination = url.searchParams.get("destination");
    if (destination?.trim()) return decodeMaybe(destination).trim();
  } catch {}

  return source.title || MESSAGE_SOURCES_TEXT.openGoogleMaps;
}

function formatYoutubeViews(value?: string) {
  if (!value) return "";
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return value;
  const numeric = Number(digits);
  if (!Number.isFinite(numeric)) return value;
  return `${numeric.toLocaleString("en-US")} views`;
}

export function extractYoutubeSubtitle(source: SourceItem) {
  return [source.channelName, source.duration, formatYoutubeViews(source.viewCount)]
    .filter(Boolean)
    .join(" | ");
}

export function formatPublishedTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function isNewsLikeSource(source: SourceItem, preview?: LinkPreview) {
  const hostname = getHostname(preview?.url || source.link).toLowerCase();
  const keywords = [
    "news",
    "times",
    "post",
    "herald",
    "guardian",
    "reuters",
    "bloomberg",
    "cnn",
    "bbc",
    "wsj",
    "apnews",
    "cnbc",
    "nbcnews",
    "abcnews",
    "foxnews",
    "techcrunch",
    "theverge",
    "forbes",
  ];

  return (
    preview?.type === "article" ||
    !!preview?.publishedTime ||
    keywords.some((keyword) => hostname.includes(keyword))
  );
}

export function buildDefaultBannerStyle(): React.CSSProperties {
  return {
    minHeight: 120,
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    background:
      "linear-gradient(135deg, #f8fafc 0%, #eef2ff 48%, #e2e8f0 100%)",
    overflow: "hidden",
    position: "relative",
  };
}

export function buildMapBannerStyle(): React.CSSProperties {
  return {
    minHeight: 148,
    borderRadius: 10,
    border: "1px solid #bfdbfe",
    background: `
      radial-gradient(circle at 18% 28%, rgba(34,197,94,0.22) 0, rgba(34,197,94,0.22) 10%, transparent 11%),
      radial-gradient(circle at 76% 34%, rgba(59,130,246,0.20) 0, rgba(59,130,246,0.20) 11%, transparent 12%),
      radial-gradient(circle at 60% 76%, rgba(249,115,22,0.18) 0, rgba(249,115,22,0.18) 9%, transparent 10%),
      linear-gradient(135deg, #eff6ff 0%, #dbeafe 46%, #bfdbfe 100%)
    `,
    overflow: "hidden",
    position: "relative",
  };
}

export function buildNewsBannerStyle(): React.CSSProperties {
  return {
    minHeight: 152,
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    background:
      "linear-gradient(135deg, #fff7ed 0%, #ffedd5 32%, #f8fafc 100%)",
    overflow: "hidden",
    position: "relative",
  };
}

export function buildYoutubeBannerStyle(): React.CSSProperties {
  return {
    minHeight: 220,
    borderRadius: 10,
    border: "1px solid #fecaca",
    background: "linear-gradient(135deg, #fff7ed 0%, #fee2e2 100%)",
    overflow: "hidden",
    position: "relative",
  };
}
