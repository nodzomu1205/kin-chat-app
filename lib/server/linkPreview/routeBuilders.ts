import {
  extractMetaTag,
  extractTitle,
  getHostname,
  resolveUrlMaybeRelative,
} from "@/lib/server/webPreview/htmlMetadata";

export function buildLinkPreviewSuccessResponse(args: {
  requestedUrl: string;
  finalUrl: string;
  contentType: string;
  html: string;
}) {
  const title = extractTitle(args.html);
  const description = extractMetaTag(args.html, [
    "og:description",
    "twitter:description",
    "description",
  ]);
  const image = extractMetaTag(args.html, ["og:image", "twitter:image"]);
  const type = extractMetaTag(args.html, ["og:type"]);
  const publishedTime = extractMetaTag(args.html, [
    "article:published_time",
    "og:published_time",
    "publication_date",
    "date",
  ]);
  const siteName =
    extractMetaTag(args.html, ["og:site_name"]) || getHostname(args.finalUrl);

  return {
    ok: true,
    url: args.finalUrl,
    siteName,
    title: title || args.finalUrl,
    description,
    image: image ? resolveUrlMaybeRelative(image, args.finalUrl) : "",
    type,
    publishedTime,
    contentType: args.contentType,
  };
}

export function buildLinkPreviewFallbackResponse(args: {
  targetUrl: string;
  error: unknown;
}) {
  return {
    ok: false,
    url: args.targetUrl,
    siteName: getHostname(args.targetUrl),
    title: args.targetUrl,
    description: "",
    image: "",
    type: "",
    publishedTime: "",
    error:
      args.error instanceof Error ? args.error.message : "preview fetch failed",
  };
}
