import { splitTextIntoKinChunks } from "@/lib/app/transformIntent";

export const DEFAULT_KIN_TASK_MULTIPART_NOTICE_LINES = [
  "MULTIPART_TASK_NOTICE:",
  "- This task is being delivered in multiple PART messages.",
  "- Until the final PART arrives, reply only with <<KIN_RESPONSE>> Received. Send the next. <<END_KIN_RESPONSE>>",
  "- Do not begin execution, searching, transcript fetches, or any other action until the final PART arrives.",
  "- Start the task only after the last PART is received.",
];

export function buildPendingKinInjectionBlocks(
  text: string,
  options?: {
    maxChars?: number;
    reserveChars?: number;
    noticeLines?: string[];
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

  return chunks.map((chunk, index) => {
    const partLine = `PART: ${index + 1}/${chunks.length}`;
    const endOfPartLine = `END OF PART ${index + 1}/${chunks.length}`;

    if (chunk.includes("<<SYS_TASK>>")) {
      const withHeader = chunk.replace(
        "<<SYS_TASK>>",
        [
          "<<SYS_TASK>>",
          partLine,
          ...noticeLines,
        ].join("\n")
      );

      const closed =
        withHeader.includes("<<END_SYS_TASK>>")
          ? withHeader
          : `${withHeader}\n<<END_SYS_TASK>>`;
      return closed.replace(
        "<<END_SYS_TASK>>",
        `${endOfPartLine}\n<<END_SYS_TASK>>`
      );
    }

    return [
      `<<SYS_TASK>>`,
      partLine,
      ...noticeLines,
      chunk,
      endOfPartLine,
      `<<END_SYS_TASK>>`,
    ]
      .filter(Boolean)
      .join("\n");
  });
}
