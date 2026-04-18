import { NextResponse } from "next/server";
import {
  buildLinkPreviewFallbackResponse,
  buildLinkPreviewSuccessResponse,
} from "@/lib/server/linkPreview/routeBuilders";
import { resolveHttpUrl } from "@/lib/server/webPreview/htmlMetadata";

export async function handleLinkPreviewRoute(rawUrl: string) {
  const resolvedUrl = resolveHttpUrl(rawUrl);
  if (!resolvedUrl.ok) {
    return NextResponse.json({ error: resolvedUrl.error }, { status: 400 });
  }

  const targetUrl = resolvedUrl.url;

  try {
    const response = await fetch(targetUrl.toString(), {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; KinChatPreview/1.0; +https://example.invalid)",
      },
      cache: "no-store",
    });

    const finalUrl = response.url || targetUrl.toString();
    const contentType = response.headers.get("content-type") || "";
    const html = await response.text();

    return NextResponse.json(
      buildLinkPreviewSuccessResponse({
        requestedUrl: targetUrl.toString(),
        finalUrl,
        contentType,
        html,
      })
    );
  } catch (error) {
    return NextResponse.json(
      buildLinkPreviewFallbackResponse({
        targetUrl: targetUrl.toString(),
        error,
      }),
      { status: 200 }
    );
  }
}
