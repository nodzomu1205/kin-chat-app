import {
  buildTranscriptFailureArtifacts,
  buildTranscriptSuccessArtifacts,
  extractYouTubeVideoIdFromUrl as extractYouTubeVideoIdFromBuilder,
  type YouTubeTranscriptApiResponse,
} from "@/lib/app/send-to-gpt/sendToGptTranscriptHelperBuilders";

export type { YouTubeTranscriptApiResponse } from "@/lib/app/send-to-gpt/sendToGptTranscriptHelperBuilders";

export function extractYouTubeVideoIdFromUrl(urlText: string) {
  return extractYouTubeVideoIdFromBuilder(urlText);
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
  return buildTranscriptSuccessArtifacts(params);
}

export function buildYoutubeTranscriptFailureText(params: {
  taskId: string;
  actionId: string;
  transcriptUrl: string;
  outputMode: string;
}) {
  return buildTranscriptFailureArtifacts(params);
}
