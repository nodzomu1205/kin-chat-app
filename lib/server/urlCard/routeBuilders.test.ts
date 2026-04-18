import { describe, expect, it } from "vitest";
import {
  buildGenericUrlCardSource,
  buildMapsUrlCardSource,
  buildYoutubeUrlCardSource,
  extractYoutubeVideoId,
  isGoogleMapsLink,
} from "@/lib/server/urlCard/routeBuilders";

describe("urlCard routeBuilders", () => {
  it("detects youtube video ids and google maps links", () => {
    expect(
      extractYoutubeVideoId("https://www.youtube.com/watch?v=abc123")
    ).toBe("abc123");
    expect(isGoogleMapsLink("https://www.google.com/maps/search/tokyo")).toBe(
      true
    );
  });

  it("builds a generic source item from html metadata", () => {
    expect(
      buildGenericUrlCardSource({
        url: "https://example.com/start",
        finalUrl: "https://example.com/final",
        html: `
          <title>Fallback title</title>
          <meta property="og:title" content="Card title">
          <meta property="og:description" content="Card description">
          <meta property="og:site_name" content="Example Site">
          <meta property="og:image" content="https://example.com/card.png">
        `,
      })
    ).toEqual({
      title: "Card title",
      link: "https://example.com/final",
      snippet: "Card description",
      sourceType: "url_card",
      thumbnailUrl: "https://example.com/card.png",
    });
  });

  it("builds youtube and maps source items", () => {
    expect(
      buildYoutubeUrlCardSource({
        url: "https://youtu.be/abc123",
        videoId: "abc123",
        title: "Video title",
        channelName: "Channel",
      })
    ).toEqual(
      expect.objectContaining({
        title: "Video title",
        sourceType: "youtube_video",
        videoId: "abc123",
        channelName: "Channel",
      })
    );

    expect(
      buildMapsUrlCardSource("https://www.google.com/maps?q=Tokyo+Station")
    ).toEqual({
      title: "Tokyo Station",
      link: "https://www.google.com/maps?q=Tokyo+Station",
      sourceType: "google_maps",
      snippet: "Open in Google Maps",
    });
  });
});
