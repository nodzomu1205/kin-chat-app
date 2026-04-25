export type IngestResult = {
  title: string;
  sourceKind: string;
  rawText: string;
  structuredSummary: string[];
  kinCompact: string[];
  kinDetailed?: string[];
  warnings?: string[];
};

export type BuildKinBlocksInput = {
  title: string;
  sourceKind: string;
  summaryLevel: string;
  contentLines: string[];
  warnings?: string[];
};

const SOFT_LIMIT = 3200;
const LINE_LIMIT = 420;

function sanitizeLine(line: string) {
  return line
    .replace(/<<SYS_INFO>>/g, "＜＜SYS_INFO＞＞")
    .replace(/<<END_SYS_INFO>>/g, "＜＜END_SYS_INFO＞＞")
    .replace(/\r/g, " ")
    .trim();
}

function splitLongLine(line: string, maxLen = LINE_LIMIT): string[] {
  const text = sanitizeLine(line);
  if (!text) return [];
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  let rest = text;

  while (rest.length > maxLen) {
    let cut = rest.lastIndexOf(" ", maxLen);
    if (cut < Math.floor(maxLen * 0.55)) {
      cut = maxLen;
    }
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }

  if (rest) chunks.push(rest);
  return chunks;
}

function buildHeader(
  title: string,
  sourceKind: string,
  summaryLevel: string,
  part: number,
  total: number
) {
  const responseMode = part < total ? "SILENT_ACK" : "FINAL_ACK";

  return [
    "<<SYS_INFO>>",
    "TYPE: KNOWLEDGE",
    `PART: ${part}/${total}`,
    `RESPONSE_MODE: ${responseMode}`,
    `TITLE: ${sanitizeLine(title || "Untitled")}`,
    `SOURCE_KIND: ${sanitizeLine(sourceKind || "unknown")}`,
    `SUMMARY_LEVEL: ${sanitizeLine(summaryLevel || "kin_compact")}`,
    "CONTENT:",
  ];
}

function composeBlock(
  title: string,
  sourceKind: string,
  summaryLevel: string,
  lines: string[],
  part: number,
  total: number
) {
  return [
    ...buildHeader(title, sourceKind, summaryLevel, part, total),
    ...lines.map((line) => `- ${line.replace(/^-+\s*/, "")}`),
    "<<END_SYS_INFO>>",
  ].join("\n");
}

export function buildKinSysInfoBlocks(input: BuildKinBlocksInput): string[] {
  const contentLines = (input.contentLines || [])
    .flatMap((line) => splitLongLine(line, LINE_LIMIT))
    .filter(Boolean);

  const warningLines = (input.warnings || [])
    .map((line) => `WARNING: ${sanitizeLine(line)}`)
    .flatMap((line) => splitLongLine(line, LINE_LIMIT))
    .slice(0, 6);

  const allLines = [...contentLines, ...warningLines];

  if (allLines.length === 0) {
    allLines.push("No reliable content could be extracted.");
  }

  const parts: string[][] = [];
  let current: string[] = [];

  for (const line of allLines) {
    const test = [...current, line];
    const preview = composeBlock(
      input.title,
      input.sourceKind,
      input.summaryLevel,
      test,
      1,
      1
    );

    if (preview.length > SOFT_LIMIT && current.length > 0) {
      parts.push(current);
      current = [line];
    } else {
      current = test;
    }
  }

  if (current.length > 0) {
    parts.push(current);
  }

  const total = parts.length;

  return parts.map((lines, index) =>
    composeBlock(
      input.title,
      input.sourceKind,
      input.summaryLevel,
      lines,
      index + 1,
      total
    )
  );
}

export function buildSingleKinSysInfoBlock(input: BuildKinBlocksInput) {
  return buildKinSysInfoBlocks(input)[0] || "";
}
