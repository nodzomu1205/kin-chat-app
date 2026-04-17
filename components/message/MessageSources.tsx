"use client";

import React from "react";
import { MESSAGE_SOURCES_TEXT } from "@/components/message/messageText";
import type { SourceItem } from "@/types/chat";
import {
  type LinkPreview,
  isGoogleMapsLink,
  isYoutubeLink,
  MessageSourcePreviewCard,
} from "./messageSourcePreview";

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
            const response = await fetch(
              `/api/link-preview?url=${encodeURIComponent(source.link)}`,
              { cache: "no-store" }
            );
            const data = (await response.json()) as LinkPreview;
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
        {MESSAGE_SOURCES_TEXT.linksTitle}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visibleSources.map((source, index) => (
          <MessageSourcePreviewCard
            key={`${source.link}-${index}`}
            source={source}
            preview={previews[source.link]}
            failedImage={!!failedImages[source.link]}
            onImageError={() =>
              setFailedImages((prev) => ({
                ...prev,
                [source.link]: true,
              }))
            }
            onImportYouTubeTranscript={onImportYouTubeTranscript}
            onSendYouTubeTranscriptToKin={onSendYouTubeTranscriptToKin}
          />
        ))}
      </div>

      {sources.length > visibleCount ? (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: "#666",
          }}
        >
          {MESSAGE_SOURCES_TEXT.remainingPrefix}
          {sources.length - visibleCount}
          {MESSAGE_SOURCES_TEXT.remainingSuffix}
        </div>
      ) : null}
    </div>
  );
}
