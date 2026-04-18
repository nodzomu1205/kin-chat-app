import { NextResponse } from "next/server";
import { requestSerpApi } from "@/lib/search-domain/serpApiClient";
import { toTranscriptText } from "@/lib/server/youtubeTranscriptHelpers";
import {
  buildTranscriptCandidateLinks,
  buildYouTubeTranscriptSuccessResponse,
  resolveYouTubeTranscriptRequest,
} from "@/lib/server/youtubeTranscript/routeBuilders";

type TranscriptResult = Record<string, unknown> & {
  transcript?: unknown;
  available_transcripts?: Array<{
    serpapi_link?: string;
    selected?: boolean;
    type?: string;
    title?: string;
  }>;
};

async function fetchTranscriptRaw(videoId: string) {
  const base = (await requestSerpApi({
    engine: "youtube_video_transcript",
    extraParams: {
      v: videoId,
    },
  })) as TranscriptResult;

  if (toTranscriptText(base.transcript).trim()) {
    return base;
  }

  for (const serpapiLink of buildTranscriptCandidateLinks(base)) {
    const fallback = (await requestSerpApi({
      engine: "youtube_video_transcript",
      serpapiLink,
    })) as TranscriptResult;

    if (toTranscriptText(fallback.transcript).trim()) {
      return fallback;
    }
  }

  return base;
}

export async function handleYouTubeTranscriptRoute(body: unknown) {
  const { videoId, title, channelName, duration } =
    resolveYouTubeTranscriptRequest(body);

  if (!videoId) {
    return NextResponse.json({ error: "videoId missing" }, { status: 400 });
  }

  const raw = await fetchTranscriptRaw(videoId);
  const transcriptText = toTranscriptText(raw.transcript);

  if (!transcriptText.trim()) {
    return NextResponse.json({ error: "transcript not found" }, { status: 404 });
  }

  return NextResponse.json(
    buildYouTubeTranscriptSuccessResponse({
      videoId,
      title,
      channelName,
      duration,
      raw,
      transcript: raw.transcript,
    })
  );
}
