const LEADING_TIMECODE =
  /^(?:\[\s*)?\d{1,2}:\d{2}(?::\d{2})?(?:\s*\])?\s*/u;
const INLINE_TIMECODE =
  /(?:^|\s)(?:\[\s*)?\d{1,2}:\d{2}(?::\d{2})?(?:\s*\])(?=\s|$)/gu;
const NOISE_BRACKETS =
  /\[(?:BGM|Music|Applause|Laughter|歓声|拍手|笑い|笑い声)\]/giu;
const TIMECODE_LINE =
  /^(?:\[\s*)?\d{1,2}:\d{2}(?::\d{2})?(?:\s*\])?\s+\S/u;
const PUNCTUATION_WITHOUT_LEADING_SPACE_RE =
  /\s+([、。,.!?;:])/gu;

function cleanSummaryLine(line: string) {
  return line
    .replace(LEADING_TIMECODE, "")
    .replace(INLINE_TIMECODE, " ")
    .replace(NOISE_BRACKETS, "")
    .replace(/\[\s*\]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function shouldNormalizeImportedDocument(input: string) {
  const lines = input
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return false;
  const timecodedLines = lines.filter((line) => TIMECODE_LINE.test(line)).length;
  return timecodedLines >= 3 || timecodedLines >= Math.ceil(lines.length * 0.3);
}

export function cleanImportSummarySource(input: string) {
  const cleanedLines = input
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => cleanSummaryLine(line))
    .filter(Boolean);

  return cleanedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function cleanImportedDocumentText(input: string) {
  if (!shouldNormalizeImportedDocument(input)) {
    return input.trim();
  }

  const cleanedLines = input
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => cleanSummaryLine(line))
    .filter(Boolean);

  return cleanedLines
    .join(" ")
    .replace(PUNCTUATION_WITHOUT_LEADING_SPACE_RE, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}
