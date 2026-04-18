import { buildKinSysInfoBlock } from "@/lib/app/kinStructuredProtocol";
import { buildYouTubeTranscriptResponseBlock } from "@/lib/app/sendToGptProtocolBuilders";
import { splitTextIntoKinChunks } from "@/lib/app/transformIntent";

const CJK_CHAR = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}繝ｼ]/u;
const SENTENCE_END = /[縲ゑｼ・ｼ・?縲阪擾ｼ・]$/u;
const OPENING_PUNCT = /^[縲後趣ｼ・]/u;

function shouldJoinWithoutSpace(previous: string, next: string) {
  const previousEnd = previous.slice(-1);
  const nextStart = next.charAt(0);

  if (!previousEnd || !nextStart) return false;
  if (SENTENCE_END.test(previous)) return false;
  if (OPENING_PUNCT.test(next)) return false;

  if (CJK_CHAR.test(previousEnd) && CJK_CHAR.test(nextStart)) {
    return true;
  }

  if (/[A-Za-z0-9]$/.test(previous) && /^[A-Za-z0-9]/.test(next)) {
    return false;
  }

  return false;
}

function normalizeTranscriptLine(line: string) {
  return line
    .replace(/^\[[^\]]+\]\s*/g, "")
    .replace(/^\d{1,2}:\d{2}(?::\d{2})?\s+/g, "")
    .replace(
      /\[(?:髻ｳ讌ｽ|諡肴焔|隨代＞|音楽|BGM|Music|Applause|Laughter)\]/gi,
      ""
    )
    .replace(/[ \t]+/g, " ")
    .trim();
}

function joinTranscriptLines(lines: string[]) {
  let output = "";

  for (const line of lines) {
    if (!line) continue;

    if (!output) {
      output = line;
      continue;
    }

    output += shouldJoinWithoutSpace(output, line) ? line : ` ${line}`;
  }

  return output
    .replace(/\s+([縲√ゑｼ・ｼ・?])/gu, "$1")
    .replace(/([縲後趣ｼ・])\s+/gu, "$1")
    .replace(/\s+([縲阪擾ｼ・])/gu, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function cleanYouTubeTranscriptText(input: string) {
  const lines = input
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .split(/\n/)
    .map((line) => normalizeTranscriptLine(line))
    .filter(Boolean);

  return joinTranscriptLines(lines);
}

export function buildYouTubeTranscriptExcerpt(input: string, maxChars = 1400) {
  const cleaned = cleanYouTubeTranscriptText(input);
  return cleaned.length > maxChars
    ? `${cleaned.slice(0, maxChars).trimEnd()}...`
    : cleaned;
}

export function buildYouTubeTranscriptKinBlocks(params: {
  cleanTranscript: string;
  title?: string;
  channelName?: string;
  url?: string;
}) {
  const chunks = splitTextIntoKinChunks(params.cleanTranscript, 3600, 260);

  return chunks.map((chunk, index) =>
    buildKinSysInfoBlock({
      title: "YouTube Script",
      content: [
        params.title ? `Title: ${params.title}` : "",
        params.channelName ? `Channel: ${params.channelName}` : "",
        params.url ? `URL: ${params.url}` : "",
        chunk,
      ]
        .filter(Boolean)
        .join("\n\n"),
      partIndex: index + 1,
      partTotal: chunks.length,
    })
  );
}

export function buildYoutubeTranscriptSuccessArtifacts(params: {
  data: {
    title?: string;
    filename?: string;
    text?: string;
    cleanText?: string;
    summary?: string;
  };
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
