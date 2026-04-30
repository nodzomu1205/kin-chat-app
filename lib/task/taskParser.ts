import type { TaskResult, TaskResultStatus, TaskType } from "@/types/task";

function isTaskType(value: string): value is TaskType {
  return value === "PREP_TASK" || value === "DEEPEN_TASK" || value === "FORMAT_TASK";
}

function isTaskResultStatus(value: string): value is TaskResultStatus {
  return value === "OK" || value === "PARTIAL" || value === "NEEDS_MORE";
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : [];
}

function extractJsonObjectText(value: string) {
  const trimmed = value.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  if (fenced) return fenced;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return "";
  return trimmed.slice(start, end + 1);
}

function parsePresentationPlanTaskResult(text: string): TaskResult | null {
  const jsonText = extractJsonObjectText(text);
  if (!jsonText) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return null;
  }

  const root = objectValue(parsed);
  if (!root || !objectValue(root.slideDesign)) return null;

  const type = stringValue(root.type);
  const status = stringValue(root.status);
  const slideDesign = objectValue(root.slideDesign) || { slides: [] };

  return {
    taskId: stringValue(root.taskId),
    type: isTaskType(type) ? type : "PREP_TASK",
    status: isTaskResultStatus(status) ? status : "PARTIAL",
    summary: stringValue(root.summary),
    keyPoints: [],
    detailBlocks: [
      { title: "抽出事項", body: stringArray(root.extractedItems) },
      { title: "Presentation Strategy", body: stringArray(root.strategyItems) },
      { title: "キーメッセージ", body: stringArray(root.keyMessages) },
      {
        title: "スライド設計JSON",
        body: [JSON.stringify({ slides: Array.isArray(slideDesign.slides) ? slideDesign.slides : [] })],
      },
    ],
    warnings: stringArray(root.warnings),
    missingInfo: stringArray(root.missingInfo),
    nextSuggestion: stringArray(root.nextSuggestion),
  };
}

export function parseTaskResult(text: string): TaskResult | null {
  try {
    const presentationPlanResult = parsePresentationPlanTaskResult(text);
    if (presentationPlanResult) return presentationPlanResult;

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
    const typeSection = getSection("TYPE");
    const statusSection = getSection("STATUS");

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
      type: isTaskType(typeSection) ? typeSection : "FORMAT_TASK",
      status: isTaskResultStatus(statusSection) ? statusSection : "PARTIAL",
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
