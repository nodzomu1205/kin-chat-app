import type {
  NormalizedSearchPayload,
  SearchRequest,
} from "@/lib/search-domain/types";
import type { SearchSourceItem } from "@/types/task";

export type YoutubeVideoResult = {
  title?: string;
  link?: string;
  snippet?: string;
  published_date?: string;
  channel?: { name?: string };
  views?: string | number;
  length?: string;
  thumbnail?: { static?: string; rich?: string };
};

export function normalizeYoutubeSources(
  items: YoutubeVideoResult[]
): SearchSourceItem[] {
  return items
    .filter((item) => item.title && item.link)
    .map((item) => {
      const videoId =
        typeof item.link === "string"
          ? (() => {
              try {
                const url = new URL(item.link);
                return url.searchParams.get("v") || "";
              } catch {
                return "";
              }
            })()
          : "";

      return {
        title: item.title || "Untitled",
        link: item.link || "",
        snippet: item.snippet,
        sourceType: "youtube_video",
        publishedAt: item.published_date,
        thumbnailUrl:
          item.thumbnail?.rich ||
          item.thumbnail?.static ||
          (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : undefined),
        channelName: item.channel?.name,
        duration: item.length,
        viewCount:
          typeof item.views === "number" ? String(item.views) : item.views,
        videoId: videoId || undefined,
      };
    });
}

export function buildYoutubeSearchPayload(args: {
  request: SearchRequest;
  sources: SearchSourceItem[];
}): NormalizedSearchPayload {
  return {
    summaryText:
      args.sources.length > 0
        ? `${args.request.query} について YouTube から ${args.sources.length} 件の動画参照情報を整理しました。`
        : `${args.request.query} について YouTube 動画は見つかりませんでした。`,
    rawText: [
      "YouTube",
      ...(args.sources.length > 0
        ? args.sources.map((source) =>
            [
              `- ${source.title}`,
              source.channelName ? `  Channel: ${source.channelName}` : "",
              source.duration ? `  Duration: ${source.duration}` : "",
              source.viewCount ? `  Views: ${source.viewCount}` : "",
              source.publishedAt ? `  Published: ${source.publishedAt}` : "",
              source.link ? `  URL: ${source.link}` : "",
              source.snippet ? `  Snippet: ${source.snippet}` : "",
            ]
              .filter(Boolean)
              .join("\n")
          )
        : ["- No videos found"]),
    ].join("\n"),
    sources: args.sources,
    metadata: { engine: "youtube_search", resultCount: args.sources.length },
  };
}
