"use client";

import React from "react";
import { MESSAGE_SOURCES_TEXT } from "@/components/message/messageText";
import type { SourceItem } from "@/types/chat";
import {
  buildDefaultBannerStyle,
  buildMapBannerStyle,
  buildNewsBannerStyle,
  buildYoutubeBannerStyle,
  extractGoogleMapsSubtitle,
  extractYoutubeEmbedId,
  formatPublishedTime,
  getHostname,
  getPreviewLabel,
} from "./messageSourcePreviewHelpers";
import type { LinkPreview } from "./messageSourcePreviewTypes";

export function MapPreviewBanner({ source }: { source: SourceItem }) {
  const subtitle = extractGoogleMapsSubtitle(source);

  return (
    <div style={buildMapBannerStyle()}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(37,99,235,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.08) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          opacity: 0.7,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 18,
          top: 16,
          width: 42,
          height: 42,
          borderRadius: "50% 50% 50% 0",
          transform: "rotate(-45deg)",
          background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
          boxShadow: "0 10px 18px rgba(220,38,38,0.22)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 11,
            borderRadius: 999,
            background: "#fff",
          }}
        />
      </div>
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "grid",
          gap: 8,
          alignContent: "end",
          minHeight: 148,
          padding: 14,
          boxSizing: "border-box",
          color: "#0f172a",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            color: "#2563eb",
          }}
        >
          Google Maps
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            lineHeight: 1.25,
            maxWidth: "82%",
          }}
        >
          {source.title || MESSAGE_SOURCES_TEXT.openGoogleMaps}
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            width: "fit-content",
            maxWidth: "88%",
            padding: "6px 10px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.72)",
            border: "1px solid rgba(37,99,235,0.16)",
            fontSize: 12,
            color: "#334155",
            lineHeight: 1.35,
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
}

export function NewsPreviewBanner({
  source,
  preview,
  failedImage,
  onImageError,
}: {
  source: SourceItem;
  preview?: LinkPreview;
  failedImage: boolean;
  onImageError: () => void;
}) {
  return (
    <div style={buildNewsBannerStyle()}>
      {preview?.image && !failedImage ? (
        // Third-party preview images are dynamic across arbitrary hosts.
        // We intentionally keep a plain img here instead of broadening Next image allowlists.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview.image}
          alt=""
          onError={onImageError}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            preview?.image && !failedImage
              ? "linear-gradient(180deg, rgba(15,23,42,0.10) 0%, rgba(15,23,42,0.82) 100%)"
              : "linear-gradient(180deg, rgba(255,247,237,0.12) 0%, rgba(255,237,213,0.42) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderRadius: 999,
          background: preview?.image ? "rgba(255,255,255,0.16)" : "#fff",
          border: preview?.image
            ? "1px solid rgba(255,255,255,0.2)"
            : "1px solid #fed7aa",
          color: preview?.image ? "#fff" : "#9a3412",
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 0.35,
          textTransform: "uppercase",
        }}
      >
        News
      </div>
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "grid",
          gap: 8,
          alignContent: "end",
          minHeight: 152,
          padding: 14,
          boxSizing: "border-box",
          color: preview?.image && !failedImage ? "#fff" : "#0f172a",
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.3,
            textTransform: "uppercase",
            opacity: 0.92,
          }}
        >
          {preview?.siteName || getHostname(source.link)}
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            lineHeight: 1.3,
            maxWidth: "88%",
          }}
        >
          {preview?.title || source.title || source.link}
        </div>
        {preview?.publishedTime ? (
          <div
            style={{
              fontSize: 12,
              opacity: 0.9,
            }}
          >
            {formatPublishedTime(preview.publishedTime)}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function YoutubePreviewBanner({ source }: { source: SourceItem }) {
  const videoId = extractYoutubeEmbedId(source);
  const thumbnail =
    source.thumbnailUrl ||
    (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "");
  const autoplaySrc = videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&playsinline=1&rel=0&modestbranding=1`
    : "";

  return (
    <div style={buildYoutubeBannerStyle()}>
      {videoId ? (
        <iframe
          src={autoplaySrc}
          title={source.title || MESSAGE_SOURCES_TEXT.youtubeVideo}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            border: 0,
          }}
        />
      ) : thumbnail ? (
        // YouTube thumbnails are external runtime URLs in a decorative banner.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnail}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(15,23,42,0.04) 0%, rgba(15,23,42,0.48) 100%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderRadius: 999,
          background: "rgba(255,255,255,0.16)",
          border: "1px solid rgba(255,255,255,0.2)",
          color: "#fff",
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 0.35,
          textTransform: "uppercase",
          zIndex: 1,
          pointerEvents: "none",
        }}
      >
        YouTube
      </div>
    </div>
  );
}

export function GenericPreviewBanner({
  source,
  preview,
  failedImage,
  onImageError,
}: {
  source: SourceItem;
  preview?: LinkPreview;
  failedImage: boolean;
  onImageError: () => void;
}) {
  return (
    <div style={buildDefaultBannerStyle()}>
      {preview?.image && !failedImage ? (
        // Third-party preview images are dynamic across arbitrary hosts.
        // We intentionally keep a plain img here instead of broadening Next image allowlists.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview.image}
          alt=""
          onError={onImageError}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            preview?.image && !failedImage
              ? "linear-gradient(180deg, rgba(15,23,42,0.12) 0%, rgba(15,23,42,0.68) 100%)"
              : "transparent",
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "grid",
          gap: 6,
          justifyItems: "start",
          alignContent: "end",
          width: "100%",
          height: "100%",
          minHeight: 120,
          padding: 14,
          boxSizing: "border-box",
          color: preview?.image && !failedImage ? "#fff" : undefined,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            opacity: 0.92,
          }}
        >
          {getPreviewLabel(preview?.url || source.link)}
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
            lineHeight: 1.3,
            textAlign: "left",
          }}
        >
          {preview?.title || source.title || getHostname(source.link)}
        </div>
      </div>
    </div>
  );
}
