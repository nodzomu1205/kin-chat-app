"use client";

import React from "react";
import { MESSAGE_SOURCES_TEXT } from "@/components/message/messageText";
import type { SourceItem } from "@/types/chat";
import { YoutubeActions } from "./MessageSourcePreviewActions";
import {
  GenericPreviewBanner,
  MapPreviewBanner,
  NewsPreviewBanner,
  YoutubePreviewBanner,
} from "./MessageSourcePreviewBanners";
import {
  extractGoogleMapsSubtitle,
  extractYoutubeSubtitle,
  getHostname,
  isGoogleMapsLink,
  isNewsLikeSource,
  isYoutubeLink,
  previewCardStyle,
} from "./messageSourcePreviewHelpers";
import type { LinkPreview } from "./messageSourcePreviewTypes";

export type { LinkPreview } from "./messageSourcePreviewTypes";
export { isGoogleMapsLink, isNewsLikeSource, isYoutubeLink };

export function MessageSourcePreviewCard({
  source,
  preview,
  failedImage,
  onImageError,
  onImportYouTubeTranscript,
  onSendYouTubeTranscriptToKin,
}: {
  source: SourceItem;
  preview?: LinkPreview;
  failedImage: boolean;
  onImageError: () => void;
  onImportYouTubeTranscript?: (source: SourceItem) => void | Promise<void>;
  onSendYouTubeTranscriptToKin?: (source: SourceItem) => void | Promise<void>;
}) {
  const isMap = isGoogleMapsLink(source.link);
  const isYoutube = isYoutubeLink(source);
  const isNews = !isMap && !isYoutube && isNewsLikeSource(source, preview);

  if (isYoutube) {
    return (
      <div style={previewCardStyle()}>
        <YoutubePreviewBanner source={source} />
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
            YouTube
          </div>
          <a
            href={source.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#0f172a",
              lineHeight: 1.4,
              textDecoration: "none",
            }}
          >
            {source.title || source.link}
          </a>
          <div
            style={{
              fontSize: 12,
              color: "#475569",
              lineHeight: 1.5,
            }}
          >
            {extractYoutubeSubtitle(source) ||
              source.snippet ||
              MESSAGE_SOURCES_TEXT.youtubeFallback}
          </div>
          <a
            href={source.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 11,
              color: "#2563eb",
              textDecoration: "underline",
              wordBreak: "break-all",
            }}
          >
            {source.link}
          </a>
          <YoutubeActions
            source={source}
            onImportYouTubeTranscript={onImportYouTubeTranscript}
            onSendYouTubeTranscriptToKin={onSendYouTubeTranscriptToKin}
          />
        </div>
      </div>
    );
  }

  return (
    <a
      href={source.link}
      target="_blank"
      rel="noopener noreferrer"
      style={previewCardStyle()}
    >
      {isMap ? (
        <MapPreviewBanner source={source} />
      ) : isNews ? (
        <NewsPreviewBanner
          source={source}
          preview={preview}
          failedImage={failedImage}
          onImageError={onImageError}
        />
      ) : (
        <GenericPreviewBanner
          source={source}
          preview={preview}
          failedImage={failedImage}
          onImageError={onImageError}
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
          {isMap ? "maps.google.com" : preview?.siteName || getHostname(source.link)}
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
        {isMap ? (
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
      </div>
    </a>
  );
}
