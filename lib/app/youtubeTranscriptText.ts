const CJK_CHAR = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]/u;
const SENTENCE_END = /[。！？!?」』）)]$/u;
const OPENING_PUNCT = /^[「『（(]/u;

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
    .replace(/\[(?:音楽|拍手|笑い|BGM|Music|Applause|Laughter)\]/gi, "")
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
    .replace(/\s+([、。！？!?])/gu, "$1")
    .replace(/([「『（(])\s+/gu, "$1")
    .replace(/\s+([」』）)])/gu, "$1")
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
