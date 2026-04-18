import { describe, expect, it } from "vitest";
import {
  buildLinkPreviewFallbackResponse,
  buildLinkPreviewSuccessResponse,
} from "@/lib/server/linkPreview/routeBuilders";

describe("linkPreview routeBuilders", () => {
  it("builds a success response from html metadata", () => {
    const payload = buildLinkPreviewSuccessResponse({
      requestedUrl: "https://example.com/start",
      finalUrl: "https://example.com/final",
      contentType: "text/html",
      html: `
        <title>Fallback title</title>
        <meta property="og:title" content="Preview title">
        <meta property="og:description" content="Preview description">
        <meta property="og:image" content="/image.png">
        <meta property="og:site_name" content="Example Site">
      `,
    });

    expect(payload).toEqual(
      expect.objectContaining({
        ok: true,
        url: "https://example.com/final",
        siteName: "Example Site",
        title: "Preview title",
        description: "Preview description",
        image: "https://example.com/image.png",
        contentType: "text/html",
      })
    );
  });

  it("builds a fallback response", () => {
    expect(
      buildLinkPreviewFallbackResponse({
        targetUrl: "https://example.com/final",
        error: new Error("boom"),
      })
    ).toEqual(
      expect.objectContaining({
        ok: false,
        url: "https://example.com/final",
        error: "boom",
      })
    );
  });
});
