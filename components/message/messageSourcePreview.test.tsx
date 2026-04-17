import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  isGoogleMapsLink,
  isNewsLikeSource,
  isYoutubeLink,
  MessageSourcePreviewCard,
} from "@/components/message/messageSourcePreview";
import type { SourceItem } from "@/types/chat";

describe("messageSourcePreview helpers", () => {
  it("detects map and youtube links", () => {
    expect(isGoogleMapsLink("https://www.google.com/maps/place/Tokyo")).toBe(true);
    expect(
      isYoutubeLink({
        title: "Video",
        link: "https://www.youtube.com/watch?v=abc123",
      })
    ).toBe(true);
  });

  it("detects news-like sources from preview metadata", () => {
    expect(
      isNewsLikeSource(
        { title: "News", link: "https://example.com/article" },
        {
          url: "https://example.com/article",
          type: "article",
          publishedTime: "2024-01-01T00:00:00.000Z",
        }
      )
    ).toBe(true);
  });
});

describe("MessageSourcePreviewCard", () => {
  it("renders youtube actions with stable labels", () => {
    const source: SourceItem = {
      title: "How to test",
      link: "https://www.youtube.com/watch?v=abc123",
      channelName: "OpenAI",
      videoId: "abc123",
    };

    const html = renderToStaticMarkup(
      <MessageSourcePreviewCard
        source={source}
        failedImage={false}
        onImageError={() => {}}
        onImportYouTubeTranscript={() => {}}
        onSendYouTubeTranscriptToKin={() => {}}
      />
    );

    expect(html).toContain("YouTube");
    expect(html).toContain("文字起こし取込");
    expect(html).toContain("文字起こしをKinへ転送");
  });
});
