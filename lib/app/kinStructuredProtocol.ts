import { buildSingleKinSysInfoBlock } from '@/lib/kinSysInfo';

function extractTaggedBlock(text: string, startTag: string, endTag: string): string {
  const start = text.indexOf(startTag);
  const end = text.indexOf(endTag);

  if (start >= 0 && end > start) {
    return text.slice(start + startTag.length, end).trim();
  }

  return text.trim();
}

function extractField(lines: string[], key: string): string {
  const prefix = `${key}:`;
  const hit = lines.find((line) => line.toUpperCase().startsWith(prefix));
  return hit ? hit.slice(prefix.length).trim() : '';
}

function extractBulletSection(lines: string[], key: string): string[] {
  const prefix = `${key}:`;
  const startIndex = lines.findIndex((line) => line.toUpperCase().startsWith(prefix));
  if (startIndex < 0) return [];

  const result: string[] = [];
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    if (/^[A-Z_]+:\s*/.test(line)) break;
    result.push(line.replace(/^-\s*/, '').trim());
  }
  return result.filter(Boolean);
}

function guessTitleFromRequest(request: string): string {
  const normalized = request.replace(/\s+/g, ' ').trim();
  if (!normalized) return 'Kin依頼';
  return normalized.slice(0, 28);
}

export type ParsedKinInstruction = {
  rawBlock: string;
  request: string;
  detailLines: string[];
  notes: string[];
  suggestedTitle: string;
  userInstruction: string;
  body: string;
};

export function parseKinInstructionMessage(text: string): ParsedKinInstruction {
  const rawBlock = extractTaggedBlock(text, '<<KIN_INSTRUCTION>>', '<<END_KIN_INSTRUCTION>>');
  const lines = rawBlock
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const request =
    extractField(lines, 'REQUEST') ||
    extractField(lines, 'QUESTION') ||
    extractField(lines, 'GOAL');

  const detailLines = [
    ...extractBulletSection(lines, 'DETAIL'),
    ...extractBulletSection(lines, 'CONTEXT'),
    ...extractBulletSection(lines, 'INPUT'),
  ];

  const notes = extractBulletSection(lines, 'NOTES');
  const fallbackBody = lines
    .filter((line) => !/^([A-Z_]+):/.test(line))
    .map((line) => line.replace(/^-\s*/, '').trim())
    .filter(Boolean);

  const bodyLines = detailLines.length > 0 ? detailLines : fallbackBody;
  const suggestedTitle = guessTitleFromRequest(request || bodyLines[0] || rawBlock);
  const userInstruction = request || 'Kinからの追加依頼を反映';
  const body = [
    request ? `Kin依頼: ${request}` : '',
    bodyLines.length > 0 ? `Kin詳細:\n${bodyLines.map((line) => `- ${line}`).join('\n')}` : rawBlock,
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    rawBlock,
    request,
    detailLines: bodyLines,
    notes,
    suggestedTitle,
    userInstruction,
    body,
  };
}

export function buildKinSysInfoFromTask(args: {
  title?: string;
  taskBody?: string;
  taskUserInstruction?: string;
  fallbackText?: string;
}) {
  const title = args.title?.trim() || 'GPT整理結果';
  const bodyText =
    args.taskBody?.trim() ||
    args.fallbackText?.trim() ||
    'No reliable task body available.';

  const lines = bodyText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 60);

  const warningLines = args.taskUserInstruction?.trim()
    ? [`USER_INSTRUCTION: ${args.taskUserInstruction.trim()}`]
    : [];

  return buildSingleKinSysInfoBlock({
    title,
    sourceKind: 'gpt_task_result',
    summaryLevel: 'kin_structured',
    contentLines: lines,
    warnings: warningLines,
  });
}
