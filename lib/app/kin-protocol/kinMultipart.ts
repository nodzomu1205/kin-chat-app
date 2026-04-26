import { splitTextIntoKinChunks } from "@/lib/app/task-runtime/transformIntent";

export type PendingKinInjectionPurpose =
  | "none"
  | "info_share"
  | "task_context";

export const DEFAULT_KIN_TASK_MULTIPART_NOTICE_LINES = [
  "MULTIPART_TASK_NOTICE:",
  "- This task is being delivered in multiple PART messages.",
  "- Until the final PART arrives, reply only with <<SYS_KIN_RESPONSE>> Received. Send the next. <<END_SYS_KIN_RESPONSE>>",
  "- Do not begin execution, searching, transcript fetches, or any other action until the final PART arrives.",
  "- Start the task only after the last PART is received.",
];

export const DEFAULT_KIN_INFO_MULTIPART_NOTICE_LINES = [
  "MULTIPART_INFO_NOTICE:",
  "- This information is being delivered in multiple PART messages.",
  "- Until the final PART arrives, reply only with <<SYS_KIN_RESPONSE>> Received. Send the next. <<END_SYS_KIN_RESPONSE>>",
  "- When the final PART arrives, reply with <<SYS_KIN_RESPONSE>> Received. <<END_SYS_KIN_RESPONSE>>",
];

function getSysWrapperNames(wrapperName: string) {
  const normalized = wrapperName.replace(/[<>]/g, "").trim();
  return {
    start: `<<${normalized}>>`,
    end: `<<END_${normalized.replace(/^SYS_/, "SYS_")}>>`,
  };
}

function stripOuterSysWrapper(text: string, wrapperName: string) {
  const { start, end } = getSysWrapperNames(wrapperName);
  const normalized = text.trim();
  if (!normalized.startsWith(start) || !normalized.endsWith(end)) {
    return normalized;
  }
  return normalized.slice(start.length, -end.length).trim();
}

export function buildPendingKinInjectionBlocks(
  text: string,
  options?: {
    maxChars?: number;
    reserveChars?: number;
    noticeLines?: string[];
    wrapperName?: "SYS_TASK" | "SYS_INFO";
    boundaryLine?: string;
  }
): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const maxChars = options?.maxChars ?? 3600;
  const reserveChars = options?.reserveChars ?? 320;
  const chunks = splitTextIntoKinChunks(normalized, maxChars, reserveChars);

  if (chunks.length <= 1) {
    return [normalized];
  }

  const noticeLines = options?.noticeLines ?? [];
  const wrapperName = options?.wrapperName ?? "SYS_TASK";
  const boundaryLine = options?.boundaryLine ?? "-----";
  const { start: wrapperStart, end: wrapperEnd } = getSysWrapperNames(wrapperName);
  const payload = stripOuterSysWrapper(normalized, wrapperName);
  const payloadChunks =
    payload === normalized
      ? chunks
      : splitTextIntoKinChunks(payload, maxChars, reserveChars);

  return payloadChunks.map((chunk, index) => {
    const partLine = `PART: ${index + 1}/${payloadChunks.length}`;
    const endOfPartLine = `END OF PART ${index + 1}/${payloadChunks.length}`;

    if (payload === normalized && chunk.includes(wrapperStart)) {
      const withHeader = chunk.replace(
        wrapperStart,
        [
          wrapperStart,
          partLine,
          ...noticeLines,
          boundaryLine,
        ].join("\n")
      );

      if (!withHeader.includes(wrapperEnd)) {
        return `${withHeader}\n${boundaryLine}\n${endOfPartLine}\n${wrapperEnd}`;
      }
      return withHeader.replace(
        wrapperEnd,
        `${boundaryLine}\n${endOfPartLine}\n${wrapperEnd}`
      );
    }

    return [
      wrapperStart,
      partLine,
      ...noticeLines,
      boundaryLine,
      chunk,
      boundaryLine,
      endOfPartLine,
      wrapperEnd,
    ]
      .filter(Boolean)
      .join("\n");
  });
}
