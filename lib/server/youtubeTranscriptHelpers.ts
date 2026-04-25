import { cleanYouTubeTranscriptText } from "@/lib/app/youtubeTranscriptText";

type TranscriptRow = Record<string, unknown>;

function isTranscriptRow(entry: unknown): entry is TranscriptRow {
  return !!entry && typeof entry === "object";
}

function extractTranscriptRowText(row: TranscriptRow) {
  if (typeof row.text === "string") return row.text.trim();
  if (typeof row.snippet === "string") return row.snippet.trim();
  return "";
}

function extractTranscriptRowStart(row: TranscriptRow) {
  if (typeof row.start === "string") return row.start.trim();
  if (typeof row.start === "number") return String(row.start);
  if (typeof row.start_time_text === "string") return row.start_time_text.trim();
  if (typeof row.timestamp === "string") return row.timestamp.trim();
  return "";
}

export function toTranscriptText(transcript: unknown) {
  if (!Array.isArray(transcript)) return "";

  return transcript
    .map((entry) => {
      if (!isTranscriptRow(entry)) return "";
      const text = extractTranscriptRowText(entry);
      if (!text) return "";
      const start = extractTranscriptRowStart(entry);
      return start ? `[${start}] ${text}` : text;
    })
    .filter(Boolean)
    .join("\n");
}

export function toCleanTranscriptText(transcript: unknown) {
  if (!Array.isArray(transcript)) return "";

  return transcript
    .map((entry) => {
      if (!isTranscriptRow(entry)) return "";
      return extractTranscriptRowText(entry);
    })
    .filter(Boolean)
    .join("\n");
}

export function buildTranscriptSummary(params: {
  title: string;
  channelName?: string;
  duration?: string;
  transcriptText: string;
}) {
  const normalizedTranscript = params.transcriptText
    .replace(/\[[^\]]+\]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const sentenceParts = normalizedTranscript
    .split(/(?<=[。．.!?！？])/u)
    .map((part) => part.trim())
    .filter(Boolean);
  const previewSource = (sentenceParts.slice(0, 2).join(" ") || normalizedTranscript).trim();
  const preview =
    previewSource.length > 220
      ? `${previewSource.slice(0, 220).trimEnd()}...`
      : previewSource;

  const meta = [params.channelName, params.duration].filter(Boolean).join(" / ");
  const titleLine = meta
    ? `YouTube transcript for ${params.title} (${meta}).`
    : `YouTube transcript for ${params.title}.`;

  return [titleLine, preview].filter(Boolean).join(" ").trim();
}

export function sanitizeTranscriptFilename(title: string) {
  const base = title
    .replace(/[^\w\-ぁ-んァ-ヶ一-龠 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `${base || "youtube_transcript"}.txt`;
}

export function buildCleanTranscriptText(transcript: unknown) {
  const text = toCleanTranscriptText(transcript) || toTranscriptText(transcript);
  return cleanYouTubeTranscriptText(text);
}
