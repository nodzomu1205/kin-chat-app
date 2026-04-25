import {
  buildYoutubeTranscriptFailureText,
  buildYoutubeTranscriptSuccessArtifacts,
} from "@/lib/app/youtube-transcript/youtubeTranscriptBuilders";

export type YouTubeTranscriptApiResponse = {
  title?: string;
  filename?: string;
  text?: string;
  cleanText?: string;
  summary?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  error?: string;
};

export function extractYouTubeVideoIdFromUrl(urlText: string) {
  const trimmed = urlText.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    if (/youtu\.be$/i.test(url.hostname)) {
      return url.pathname.replace(/^\/+/, "").trim();
    }
    if (
      /youtube\.com$/i.test(url.hostname) ||
      /www\.youtube\.com$/i.test(url.hostname)
    ) {
      return url.searchParams.get("v")?.trim() || "";
    }
  } catch {}
  return "";
}

export function buildTranscriptSuccessArtifacts(args: {
  data: YouTubeTranscriptApiResponse;
  videoId: string;
  transcriptUrl: string;
  outputMode: string;
  taskId: string;
  actionId: string;
  storedDocumentId: string;
}) {
  return buildYoutubeTranscriptSuccessArtifacts(args);
}

export function buildTranscriptFailureArtifacts(args: {
  taskId: string;
  actionId: string;
  transcriptUrl: string;
  outputMode: string;
}) {
  return buildYoutubeTranscriptFailureText(args);
}
