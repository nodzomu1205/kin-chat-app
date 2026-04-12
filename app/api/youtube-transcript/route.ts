import { NextResponse } from "next/server";
import { requestSerpApi } from "@/lib/search-domain/serpApiClient";

type TranscriptResult = Record<string, unknown> & {
  transcript?: unknown;
  available_transcripts?: Array<{
    serpapi_link?: string;
    selected?: boolean;
    type?: string;
    title?: string;
  }>;
};

function buildTranscriptSummary(params: {
  title: string;
  channelName?: string;
  duration?: string;
  transcriptText: string;
}) {
  const firstSentence = params.transcriptText
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[。.!?])/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");

  const meta = [params.channelName, params.duration].filter(Boolean).join(" / ");
  const titleLine = meta
    ? `YouTube transcript for ${params.title} (${meta}).`
    : `YouTube transcript for ${params.title}.`;

  return [titleLine, firstSentence].filter(Boolean).join(" ").trim();
}

function sanitizeFilename(title: string, videoId: string) {
  const base = title.replace(/[^\w\-ぁ-んァ-ヶ一-龯 ]+/g, " ").replace(/\s+/g, " ").trim();
  return `${base || "youtube_transcript"}-${videoId}.txt`;
}

function toTranscriptText(transcript: unknown) {
  if (!Array.isArray(transcript)) return "";

  return transcript
    .map((entry) => {
      if (!entry || typeof entry !== "object") return "";
      const row = entry as Record<string, unknown>;
      const text =
        typeof row.text === "string"
          ? row.text.trim()
          : typeof row.snippet === "string"
            ? row.snippet.trim()
            : "";
      if (!text) return "";
      const start =
        typeof row.start === "string"
          ? row.start.trim()
          : typeof row.start === "number"
            ? String(row.start)
            : typeof row.start_time_text === "string"
              ? row.start_time_text.trim()
            : typeof row.timestamp === "string"
              ? row.timestamp.trim()
              : "";

      return start ? `[${start}] ${text}` : text;
    })
    .filter(Boolean)
    .join("\n");
}

function toCleanTranscriptText(transcript: unknown) {
  if (!Array.isArray(transcript)) return "";

  return transcript
    .map((entry) => {
      if (!entry || typeof entry !== "object") return "";
      const row = entry as Record<string, unknown>;
      const text =
        typeof row.text === "string"
          ? row.text.trim()
          : typeof row.snippet === "string"
            ? row.snippet.trim()
            : "";
      return text;
    })
    .filter(Boolean)
    .join("\n");
}

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
    const cleanText = toCleanTranscriptText(raw.transcript);

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
      filename: sanitizeFilename(resolvedTitle, videoId),
      text: transcriptText,
      cleanText: cleanText || transcriptText.replace(/^\[[^\]]+\]\s*/gm, "").trim(),
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
