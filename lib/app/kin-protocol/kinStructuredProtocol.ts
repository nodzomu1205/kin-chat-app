function sanitizeLine(line: string): string {
  return line
    .replace(/<<SYS_INFO>>/g, "＜＜SYS_INFO＞＞")
    .replace(/<<END_SYS_INFO>>/g, "＜＜END_SYS_INFO＞＞")
    .replace(/<<SYS_TASK>>/g, "＜＜SYS_TASK＞＞")
    .replace(/<<END_SYS_TASK>>/g, "＜＜END_SYS_TASK＞＞")
    .replace(/<<KIN_TO_GPT>>/g, "＜＜KIN_TO_GPT＞＞")
    .replace(/<<END_KIN_TO_GPT>>/g, "＜＜END_KIN_TO_GPT＞＞")
    .replace(/\r/g, " ")
    .trim();
}

function splitContentLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => sanitizeLine(line))
    .filter(Boolean);
}

function extractTaggedBlock(text: string, startTag: string, endTag: string): string | null {
  const start = text.indexOf(startTag);
  const end = text.indexOf(endTag);

  if (start >= 0 && end > start) {
    return text.slice(start, end + endTag.length).trim();
  }

  return null;
}

function normalizeDirectiveText(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function buildDirectiveLines(args: {
  directive?: string;
  directiveLines?: string[];
}): string[] {
  const lines = [
    ...(Array.isArray(args.directiveLines) ? args.directiveLines : []),
    ...(args.directive ? [args.directive] : []),
  ]
    .flatMap((line) => normalizeDirectiveText(line).split(/\r?\n/))
    .map((line) => sanitizeLine(line))
    .filter(Boolean);

  return Array.from(new Set(lines));
}

function isRedundantInfoLine(line: string, title?: string, fileName?: string) {
  const normalized = line.trim();
  if (!normalized) return true;

  const lower = normalized.toLowerCase();
  if (lower === "content:" || lower === "- content:") return true;

  const titleValue = (title || "").trim();
  const fileValue = (fileName || "").trim();

  if (titleValue && normalized === `Title: ${titleValue}`) return true;
  if (titleValue && normalized === `- Title: ${titleValue}`) return true;
  if (fileValue && normalized === `File: ${fileValue}`) return true;
  if (fileValue && normalized === `- File: ${fileValue}`) return true;

  return false;
}

function normalizeInfoContent(args: {
  content: string;
  title?: string;
  fileName?: string;
}): string[] {
  return splitContentLines(args.content).filter(
    (line) => !isRedundantInfoLine(line, args.title, args.fileName)
  );
}

export type KinBlockMode = "sys_info" | "sys_task";

export function formatTaskSlot(slot?: number): string {
  const normalized = Number.isFinite(slot) && (slot ?? 0) > 0 ? Number(slot) : 1;
  return `#${String(normalized).padStart(2, "0")}`;
}

export function resolveKinBlockModeAndDirective(
  input: string,
  defaultMode: KinBlockMode
): {
  mode: KinBlockMode;
  directive: string;
} {
  const lines = input.split(/\r?\n/);
  const firstNonEmptyIndex = lines.findIndex((line) => line.trim().length > 0);

  if (firstNonEmptyIndex < 0) {
    return {
      mode: defaultMode,
      directive: "",
    };
  }

  const firstLine = lines[firstNonEmptyIndex].trim();
  const match = firstLine.match(/^(INFO|SYS_INFO|TASK|SYS_TASK)\s*[:：]\s*(.*)$/i);

  if (!match) {
    return {
      mode: defaultMode,
      directive: normalizeDirectiveText(input),
    };
  }

  const prefix = match[1].toUpperCase();
  const remainder = match[2]?.trim() || "";
  const restLines = lines.slice(firstNonEmptyIndex + 1);
  const directive = normalizeDirectiveText([remainder, ...restLines].join("\n"));

  return {
    mode: prefix.includes("TASK") ? "sys_task" : "sys_info",
    directive,
  };
}

export function buildKinSysInfoBlock(args: {
  taskSlot?: number;
  title?: string;
  fileName?: string;
  content: string;
  directive?: string;
  directiveLines?: string[];
  partIndex?: number;
  partTotal?: number;
}): string {
  const title = sanitizeLine(args.title || "共有情報");
  const lines = normalizeInfoContent({
    content: args.content,
    title,
    fileName: args.fileName,
  });
  const directiveLines = buildDirectiveLines(args);

  return [
    "<<SYS_INFO>>",
    args.partTotal && args.partTotal > 1
      ? `PART: ${Math.max(1, args.partIndex || 1)}/${args.partTotal}`
      : "",
    `TITLE: ${title}`,
    directiveLines.length > 0 ? "USER_DIRECTIVE:" : "",
    ...directiveLines.map((line) => `- ${line}`),
    "CONTENT:",
    ...(lines.length > 0 ? lines : ["No reliable content available."]).map((line) =>
      line.startsWith("- ") ? line : `- ${line}`
    ),
    "<<END_SYS_INFO>>",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildKinSysTaskBlock(args: {
  taskSlot?: number;
  title?: string;
  content: string;
  directive?: string;
  directiveLines?: string[];
  partIndex?: number;
  partTotal?: number;
}): string {
  const taskId = formatTaskSlot(args.taskSlot);
  const title = sanitizeLine(args.title || "GPTタスク");
  const lines = splitContentLines(args.content);
  const directiveLines = buildDirectiveLines(args);
  const joinedDirective = directiveLines.join(" ").toLowerCase();
  const strongReplacement =
    /different|discard previous|replace previous|must discard|must not keep|前の|外して前|前回と違う|別のものにして/u.test(
      joinedDirective
    );

  return [
    "<<SYS_TASK>>",
    args.partTotal && args.partTotal > 1
      ? `PART: ${Math.max(1, args.partIndex || 1)}/${args.partTotal}`
      : "",
    args.partTotal && args.partTotal > 1 ? "TRANSFER_NOTICE:" : "",
    ...(args.partTotal && args.partTotal > 1
      ? [
          '- This task is still arriving in multiple parts. Reply only with "Received." until the final PART arrives.',
          "- Do not begin execution until the final PART arrives.",
        ]
      : []),
    `TASK_ID: ${taskId}`,
    `TITLE: ${title}`,
    "GOAL: Use the material below as the active task context and act on it.",
    "TASK_POLICY:",
    "- The latest explicit user instruction overrides earlier conclusions when they conflict.",
    "- Previous selections or prior conclusions are revisable and not binding.",
    "- Prefer the newest provided material over older drafts or stale assumptions.",
    strongReplacement
      ? "- If the latest instruction asks for a different selection, you MUST discard the previous selection and choose a different one."
      : "",
    "TODO:",
    "- Review INPUT as the main working material.",
    directiveLines.length > 0
      ? "- Follow USER_DIRECTIVE carefully."
      : "- Proceed with the task based on INPUT.",
    "CONSTRAINTS:",
    "- Keep meta labels in English.",
    "- Do not echo the task block.",
    directiveLines.length > 0 ? "USER_DIRECTIVE:" : "",
    ...directiveLines.map((line) => `- ${line}`),
    "INPUT:",
    ...(lines.length > 0 ? lines : ["No reliable content available."]).map((line) =>
      line.startsWith("- ") ? line : `- ${line}`
    ),
    "IF_MISSING:",
    `- Return a <<KIN_TO_GPT>> block with TASK_ID: ${taskId}.`,
    "OUTPUT:",
    "- Reply to the user normally, or return a <<KIN_TO_GPT>> block if GPT support is needed.",
    "<<END_SYS_TASK>>",
  ]
    .filter(Boolean)
    .join("\n");
}

export function extractPreferredKinTransferText(text: string): string {
  const kinToGptBlock = extractTaggedBlock(text, "<<KIN_TO_GPT>>", "<<END_KIN_TO_GPT>>");
  if (kinToGptBlock) return kinToGptBlock;

  const kinInstructionBlock = extractTaggedBlock(
    text,
    "<<KIN_INSTRUCTION>>",
    "<<END_KIN_INSTRUCTION>>"
  );
  if (kinInstructionBlock) return kinInstructionBlock;

  return text.trim();
}
