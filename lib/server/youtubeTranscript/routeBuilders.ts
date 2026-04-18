import {
  buildCleanTranscriptText,
  buildTranscriptSummary,
  sanitizeTranscriptFilename,
  toTranscriptText,
} from "@/lib/server/youtubeTranscriptHelpers";

type TranscriptCandidate = {
  serpapi_link?: string;
  selected?: boolean;
  type?: string;
};

type TranscriptPayload = {
  transcript?: unknown;
  available_transcripts?: TranscriptCandidate[];
};

export function resolveYouTubeTranscriptRequest(body: unknown) {
  const candidate =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return {
    videoId:
      typeof candidate.videoId === "string" ? candidate.videoId.trim() : "",
    title: typeof candidate.title === "string" ? candidate.title.trim() : "",
    channelName:
      typeof candidate.channelName === "string"
        ? candidate.channelName.trim()
        : "",
    duration:
      typeof candidate.duration === "string" ? candidate.duration.trim() : "",
  };
}

export function buildTranscriptCandidateLinks(payload: TranscriptPayload) {
  const candidates = Array.isArray(payload.available_transcripts)
    ? payload.available_transcripts
    : [];

  const prioritized = [
    ...candidates.filter((item) => item.selected && item.serpapi_link),
    ...candidates.filter((item) => item.type === "asr" && item.serpapi_link),
    ...candidates.filter((item) => item.serpapi_link),
  ];

  const seen = new Set<string>();
  return prioritized
    .map((candidate) => candidate.serpapi_link?.trim() || "")
    .filter((link) => {
      if (!link || seen.has(link)) return false;
      seen.add(link);
      return true;
    });
}

export function buildYouTubeTranscriptSuccessResponse(args: {
  videoId: string;
  title?: string;
  channelName?: string;
  duration?: string;
  raw: unknown;
  transcript: unknown;
}) {
  const transcriptText = toTranscriptText(args.transcript);
  const resolvedTitle = args.title?.trim() || `YouTube Transcript ${args.videoId}`;

  return {
    title: `${resolvedTitle} [Transcript]`,
    filename: sanitizeTranscriptFilename(resolvedTitle, args.videoId),
    text: transcriptText,
    cleanText: buildCleanTranscriptText(args.transcript),
    summary: buildTranscriptSummary({
      title: resolvedTitle,
      channelName: args.channelName,
      duration: args.duration,
      transcriptText,
    }),
    raw: args.raw,
  };
}
