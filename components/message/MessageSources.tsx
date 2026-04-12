"use client";

import React from "react";
import type { SourceItem } from "@/types/chat";

type LinkPreview = {
  ok?: boolean;
  url: string;
  siteName?: string;
  title?: string;
  description?: string;
  image?: string;
  type?: string;
  publishedTime?: string;
};

function previewCardStyle(): React.CSSProperties {
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

function isYoutubeLink(source: SourceItem) {
  const normalized = source.link.toLowerCase();
  return (
    normalized.includes("youtube.com/watch") ||
    normalized.includes("youtu.be/") ||
    source.sourceType === "youtube_video" ||
    !!source.videoId
  );
}

function getPreviewLabel(link: string) {
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

function extractGoogleMapsSubtitle(source: SourceItem) {
  try {
    const url = new URL(source.link);
    const query = url.searchParams.get("query");
    if (query?.trim()) return decodeMaybe(query).trim();

    const destination = url.searchParams.get("destination");
    if (destination?.trim()) return decodeMaybe(destination).trim();
  } catch {}

  return source.title || "Open in Google Maps";
}

function formatYoutubeViews(value?: string) {
  if (!value) return "";
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return value;
  const numeric = Number(digits);
  if (!Number.isFinite(numeric)) return value;
  return `${numeric.toLocaleString("en-US")} views`;
}

function extractYoutubeSubtitle(source: SourceItem) {
  return [
    source.channelName,
    source.duration,
    formatYoutubeViews(source.viewCount),
  ]
    .filter(Boolean)
    .join(" · ");
}

function formatPublishedTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function isNewsLikeSource(source: SourceItem, preview?: LinkPreview) {
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

function buildDefaultBannerStyle(): React.CSSProperties {
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

function buildMapBannerStyle(): React.CSSProperties {
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

function buildNewsBannerStyle(): React.CSSProperties {
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

function buildYoutubeBannerStyle(): React.CSSProperties {
  return {
    minHeight: 152,
    borderRadius: 10,
    border: "1px solid #fecaca",
    background: "linear-gradient(135deg, #fff7ed 0%, #fee2e2 100%)",
    overflow: "hidden",
    position: "relative",
  };
}

function MapPreviewBanner({ source }: { source: SourceItem }) {
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
          {source.title || "Open in Google Maps"}
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

function NewsPreviewBanner({
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

function YoutubePreviewBanner({ source }: { source: SourceItem }) {
  const thumbnail =
    source.thumbnailUrl ||
    (source.videoId ? `https://i.ytimg.com/vi/${source.videoId}/hqdefault.jpg` : "");

  return (
    <div style={buildYoutubeBannerStyle()}>
      {thumbnail ? (
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
            "linear-gradient(180deg, rgba(15,23,42,0.12) 0%, rgba(15,23,42,0.78) 100%)",
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
        }}
      >
        YouTube
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
          color: "#fff",
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
          {source.channelName || "YouTube"}
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            lineHeight: 1.3,
            maxWidth: "88%",
          }}
        >
          {source.title || "YouTube Video"}
        </div>
        {extractYoutubeSubtitle(source) ? (
          <div style={{ fontSize: 12, opacity: 0.92 }}>
            {extractYoutubeSubtitle(source)}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function GenericPreviewBanner({
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

export default function MessageSources({
  sources,
  sourceDisplayCount = 3,
  onImportYouTubeTranscript,
  onSendYouTubeTranscriptToKin,
}: {
  sources: SourceItem[];
  sourceDisplayCount?: number;
  onImportYouTubeTranscript?: (source: SourceItem) => void | Promise<void>;
  onSendYouTubeTranscriptToKin?: (source: SourceItem) => void | Promise<void>;
}) {
  const visibleCount = Math.max(1, sourceDisplayCount || 1);
  const visibleSources = React.useMemo(
    () => (sources || []).slice(0, visibleCount),
    [sources, visibleCount]
  );
  const [previews, setPreviews] = React.useState<Record<string, LinkPreview>>({});
  const [failedImages, setFailedImages] = React.useState<Record<string, true>>({});

  React.useEffect(() => {
    let cancelled = false;
    const sourcesNeedingFetch = visibleSources.filter(
      (source) => !isGoogleMapsLink(source.link) && !isYoutubeLink(source)
    );

    async function load() {
      const entries = await Promise.all(
        sourcesNeedingFetch.map(async (source) => {
          try {
            const res = await fetch(
              `/api/link-preview?url=${encodeURIComponent(source.link)}`,
              { cache: "no-store" }
            );
            const data = (await res.json()) as LinkPreview;
            return [source.link, data] as const;
          } catch {
            return [
              source.link,
              {
                url: source.link,
                siteName: "",
                title: source.title || source.link,
                description: "",
                image: "",
                type: "",
                publishedTime: "",
              },
            ] as const;
          }
        })
      );

      if (cancelled) return;
      setPreviews((prev) => ({
        ...prev,
        ...Object.fromEntries(entries),
      }));
    }

    if (sourcesNeedingFetch.length > 0) {
      void load();
    }

    return () => {
      cancelled = true;
    };
  }, [visibleSources]);

  if (!sources || sources.length === 0) return null;

  return (
    <div
      style={{
        marginTop: 12,
        paddingTop: 10,
        borderTop: "1px dashed #ccc",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 8,
          color: "#555",
        }}
      >
        参考リンク
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visibleSources.map((source, index) => {
          const preview = previews[source.link];
          const isMap = isGoogleMapsLink(source.link);
          const isYoutube = isYoutubeLink(source);
          const isNews = !isMap && !isYoutube && isNewsLikeSource(source, preview);

          return (
            <a
              key={`${source.link}-${index}`}
              href={source.link}
              target="_blank"
              rel="noopener noreferrer"
              style={previewCardStyle()}
            >
              {isMap ? (
                <MapPreviewBanner source={source} />
              ) : isYoutube ? (
                <YoutubePreviewBanner source={source} />
              ) : isNews ? (
                <NewsPreviewBanner
                  source={source}
                  preview={preview}
                  failedImage={!!failedImages[source.link]}
                  onImageError={() =>
                    setFailedImages((prev) => ({
                      ...prev,
                      [source.link]: true,
                    }))
                  }
                />
              ) : (
                <GenericPreviewBanner
                  source={source}
                  preview={preview}
                  failedImage={!!failedImages[source.link]}
                  onImageError={() =>
                    setFailedImages((prev) => ({
                      ...prev,
                      [source.link]: true,
                    }))
                  }
                />
              )}

              <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: 0.3,
                  }}
                >
                  {isYoutube
                    ? "YouTube"
                    : isMap
                      ? "maps.google.com"
                      : preview?.siteName || getHostname(source.link)}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#0f172a",
                    lineHeight: 1.4,
                  }}
                >
                  {source.title || preview?.title || source.link}
                </div>
                {isYoutube ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#475569",
                      lineHeight: 1.5,
                    }}
                  >
                    {extractYoutubeSubtitle(source) || source.snippet || "YouTube video"}
                  </div>
                ) : isMap ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#475569",
                      lineHeight: 1.5,
                    }}
                  >
                    {extractGoogleMapsSubtitle(source)}
                  </div>
                ) : preview?.description ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#475569",
                      lineHeight: 1.5,
                    }}
                  >
                    {preview.description}
                  </div>
                ) : source.snippet ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#475569",
                      lineHeight: 1.5,
                    }}
                  >
                    {source.snippet}
                  </div>
                ) : null}
                <div
                  style={{
                    fontSize: 11,
                    color: "#2563eb",
                    textDecoration: "underline",
                    wordBreak: "break-all",
                  }}
                >
                  {source.link}
                </div>

                {isYoutube && (onImportYouTubeTranscript || onSendYouTubeTranscriptToKin) ? (
                  <div style={{ marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {onImportYouTubeTranscript ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void onImportYouTubeTranscript(source);
                        }}
                        style={{
                          height: 30,
                          borderRadius: 999,
                          border: "1px solid #fca5a5",
                          background: "#fff",
                          color: "#b91c1c",
                          padding: "0 12px",
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        文字起こし取込
                      </button>
                    ) : null}

                    {onSendYouTubeTranscriptToKin ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void onSendYouTubeTranscriptToKin(source);
                        }}
                        style={{
                          height: 30,
                          borderRadius: 999,
                          border: "1px solid #c4b5fd",
                          background: "#fff",
                          color: "#7c3aed",
                          padding: "0 12px",
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        文字起こしKin送付
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </a>
          );
        })}
      </div>

      {sources.length > visibleCount ? (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: "#666",
          }}
        >
          残り {sources.length - visibleCount} 件
        </div>
      ) : null}
    </div>
  );
}
