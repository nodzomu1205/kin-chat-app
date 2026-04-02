import { TaskResult } from "@/types/task";

export function parseTaskResult(text: string): TaskResult | null {
  try {
    const getSection = (label: string) => {
      const regex = new RegExp(`${label}:([\\s\\S]*?)(?=\\n[A-Z_]+:|<<END_SYS_TASK_RESULT>>)`,"m");
      return text.match(regex)?.[1]?.trim() || "";
    };

    const list = (str: string) =>
      str
        .split("\n")
        .map((l) => l.replace(/^- /, "").trim())
        .filter(Boolean);

    const detailBlocksRaw = getSection("DETAIL_BLOCKS");

    const detailBlocks =
      detailBlocksRaw
        ?.split("[BLOCK:")
        .slice(1)
        .map((block) => {
          const [titlePart, ...rest] = block.split("]");
          return {
            title: titlePart.trim(),
            body: list(rest.join("")),
          };
        }) || [];

    return {
      taskId: getSection("TASK_ID"),
      type: getSection("TYPE") as any,
      status: getSection("STATUS") as any,
      summary: getSection("SUMMARY"),
      keyPoints: list(getSection("KEY_POINTS")),
      detailBlocks,
      warnings: list(getSection("WARNINGS")),
      missingInfo: list(getSection("MISSING_INFO")),
      nextSuggestion: list(getSection("NEXT_SUGGESTION")),
    };
  } catch (e) {
    console.error("parseTaskResult error", e);
    return null;
  }
}