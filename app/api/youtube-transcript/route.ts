import { NextResponse } from "next/server";
import { requestSerpApi } from "@/lib/search-domain/serpApiClient";
import {
  buildCleanTranscriptText,
  buildTranscriptSummary,
  sanitizeTranscriptFilename,
  toTranscriptText,
} from "@/lib/server/youtubeTranscriptHelpers";

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

  const candidates = Array.isArray(base.available_transcripts)
    ? base.available_transcripts
    : [];

  const prioritized = [
    ...candidates.filter((item) => item.selected && item.serpapi_link),
    ...candidates.filter((item) => item.type === "asr" && item.serpapi_link),
    ...candidates.filter((item) => item.serpapi_link),
  ];

  const seen = new Set<string>();
  for (const candidate of prioritized) {
    const serpapiLink = candidate.serpapi_link?.trim();
    if (!serpapiLink || seen.has(serpapiLink)) continue;
    seen.add(serpapiLink);

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const videoId =
      typeof body?.videoId === "string" ? body.videoId.trim() : "";
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const channelName =
      typeof body?.channelName === "string" ? body.channelName.trim() : "";
    const duration =
      typeof body?.duration === "string" ? body.duration.trim() : "";

    if (!videoId) {
      return NextResponse.json({ error: "videoId missing" }, { status: 400 });
    }

    const raw = await fetchTranscriptRaw(videoId);
    const transcriptText = toTranscriptText(raw.transcript);

    if (!transcriptText.trim()) {
      return NextResponse.json(
        { error: "transcript not found" },
        { status: 404 }
      );
    }

    const resolvedTitle = title || `YouTube Transcript ${videoId}`;
    const summary = buildTranscriptSummary({
      title: resolvedTitle,
      channelName,
      duration,
      transcriptText,
    });

    return NextResponse.json({
      title: `${resolvedTitle} [Transcript]`,
      filename: sanitizeTranscriptFilename(resolvedTitle, videoId),
      text: transcriptText,
      cleanText: buildCleanTranscriptText(raw.transcript),
      summary,
      raw,
    });
  } catch (error) {
    console.error("youtube transcript route error:", error);
    return NextResponse.json(
      { error: "youtube transcript fetch failed" },
      { status: 500 }
    );
  }
}
