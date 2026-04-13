import { buildYouTubeTranscriptResponseBlock } from "@/lib/app/sendToGptFlowHelpers";
import { buildYouTubeTranscriptExcerpt } from "@/lib/app/youtubeTranscriptText";
import { buildYouTubeTranscriptKinBlocks } from "@/lib/app/youtubeTranscriptKinBlocks";
import { cleanYouTubeTranscriptText } from "@/lib/app/youtubeTranscriptText";

export type YouTubeTranscriptApiResponse = {
  title?: string;
  filename?: string;
  text?: string;
  cleanText?: string;
  summary?: string;
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
    if (/youtube\.com$/i.test(url.hostname) || /www\.youtube\.com$/i.test(url.hostname)) {
      return url.searchParams.get("v")?.trim() || "";
    }
  } catch {}
  return "";
}

export function buildYoutubeTranscriptSuccessArtifacts(params: {
  data: YouTubeTranscriptApiResponse;
  videoId: string;
  transcriptUrl: string;
  outputMode: string;
  taskId: string;
  actionId: string;
  storedDocumentId: string;
}) {
  const title = params.data.title || `YouTube Transcript ${params.videoId}`;
  const cleanTranscript = cleanYouTubeTranscriptText(
    params.data.cleanText || params.data.text || ""
  );
  const transcriptExcerpt = buildYouTubeTranscriptExcerpt(
    cleanTranscript,
    params.outputMode === "summary" ? 0 : 2800
  );
  const kinBlocks = buildYouTubeTranscriptKinBlocks({
    cleanTranscript,
    title,
    url: params.transcriptUrl,
  });
  const assistantText = buildYouTubeTranscriptResponseBlock({
    taskId: params.taskId,
    actionId: params.actionId,
    url: params.transcriptUrl,
    outputMode: params.outputMode,
    title,
    channel: "",
    summary:
      params.data.summary ||
      "Transcript fetched and stored in the library for downstream use.",
    rawExcerpt: params.outputMode === "summary" ? undefined : transcriptExcerpt,
    libraryItemId: `doc:${params.storedDocumentId}`,
  });

  return {
    title,
    cleanTranscript,
    filename: params.data.filename || `youtube-${params.videoId}.txt`,
    summary: params.data.summary || "",
    kinBlocks,
    assistantText,
  };
}

export function buildYoutubeTranscriptFailureText(params: {
  taskId: string;
  actionId: string;
  transcriptUrl: string;
  outputMode: string;
}) {
  return buildYouTubeTranscriptResponseBlock({
    taskId: params.taskId,
    actionId: params.actionId,
    url: params.transcriptUrl,
    outputMode: params.outputMode,
    title: "Unknown video",
    channel: "",
    summary: "Transcript could not be fetched for the requested YouTube content.",
  });
}
