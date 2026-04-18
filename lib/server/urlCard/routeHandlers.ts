import { NextResponse } from "next/server";
import {
  buildGenericUrlCardSource,
  buildMapsUrlCardSource,
  buildYoutubeUrlCardSource,
  extractYoutubeVideoId,
  isGoogleMapsLink,
} from "@/lib/server/urlCard/routeBuilders";
import { resolveHttpUrl } from "@/lib/server/webPreview/htmlMetadata";

async function resolveGenericSource(url: string) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; KinChatPreview/1.0; +https://example.invalid)",
    },
    cache: "no-store",
  });

  const finalUrl = response.url || url;
  const html = await response.text();
  return buildGenericUrlCardSource({
    url,
    finalUrl,
    html,
  });
}

async function resolveYoutubeSource(url: string, videoId: string) {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  let title = "YouTube Video";
  let channelName = "YouTube";

  try {
    const response = await fetch(oembedUrl, { cache: "no-store" });
    if (response.ok) {
      const data = (await response.json()) as {
        title?: string;
        author_name?: string;
      };
      title = data.title?.trim() || title;
      channelName = data.author_name?.trim() || channelName;
    }
  } catch {}

  return buildYoutubeUrlCardSource({
    url,
    videoId,
    title,
    channelName,
  });
}

export async function handleUrlCardRoute(rawUrl: string) {
  const resolvedUrl = resolveHttpUrl(rawUrl);
  if (!resolvedUrl.ok) {
    return NextResponse.json({ error: resolvedUrl.error }, { status: 400 });
  }

  const url = resolvedUrl.url.toString();

  try {
    const videoId = extractYoutubeVideoId(url);
    const source = videoId
      ? await resolveYoutubeSource(url, videoId)
      : isGoogleMapsLink(url)
        ? buildMapsUrlCardSource(url)
        : await resolveGenericSource(url);

    return NextResponse.json({ ok: true, source });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "url card resolve failed",
      },
      { status: 500 }
    );
  }
}
