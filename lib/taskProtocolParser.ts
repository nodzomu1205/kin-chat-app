import type { SearchResultMode, TaskProtocolEvent } from "@/types/taskProtocol";

const BLOCK_REGEX = /<<SYS_([A-Z_]+)>>([\s\S]*?)<<END_SYS_\1>>/g;
const TASK_BLOCK_REGEX = /<<SYS_TASK>>[\s\S]*?<<SYS_TASK_END>>/g;
const INFO_BLOCK_REGEX = /<<SYS_INFO>>[\s\S]*?<<END_SYS_INFO>>/g;

export function normalizeTaskProtocolEventType(
  raw: string
): TaskProtocolEvent["type"] | null {
  switch (raw) {
    case "TASK_PROGRESS":
      return "task_progress";
    case "ASK_GPT":
      return "ask_gpt";
    case "GPT_RESPONSE":
      return "gpt_response";
    case "SEARCH_REQUEST":
      return "search_request";
    case "SEARCH_RESPONSE":
      return "search_response";
    case "YOUTUBE_TRANSCRIPT_REQUEST":
      return "youtube_transcript_request";
    case "YOUTUBE_TRANSCRIPT_RESPONSE":
      return "youtube_transcript_response";
    case "LIBRARY_INDEX_REQUEST":
      return "library_index_request";
    case "LIBRARY_INDEX_RESPONSE":
      return "library_index_response";
    case "LIBRARY_ITEM_REQUEST":
      return "library_item_request";
    case "LIBRARY_ITEM_RESPONSE":
      return "library_item_response";
    case "USER_QUESTION":
      return "user_question";
    case "MATERIAL_REQUEST":
      return "material_request";
    case "TASK_DONE":
      return "task_done";
    case "TASK_CONFIRM":
      return "task_confirm";
    default:
      return null;
  }
}

export function parseProtocolBlockFields(body: string) {
  const fields: Record<string, string> = {};
  let currentKey = "";

  for (const rawLine of body.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trimEnd();
    const match = line.match(/^([A-Z_]+)\s*:\s*(.*)$/);
    if (match) {
      currentKey = match[1];
      fields[currentKey] = match[2].trim();
      continue;
    }

    if (currentKey) {
      fields[currentKey] = [fields[currentKey], line]
        .filter(Boolean)
        .join("\n")
        .trim();
    }
  }

  return fields;
}

export function parseProtocolRequired(value: string | undefined) {
  if (!value) return false;
  return /^(yes|true|required|1)$/i.test(value.trim());
}

export function parseProtocolSearchOutputMode(
  value: string | undefined
): SearchResultMode | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "summary") return "summary";
  if (normalized === "raw") return "raw";
  if (
    normalized === "summary_plus_raw" ||
    normalized === "raw_and_summary" ||
    normalized === "summary_with_sources"
  ) {
    return "summary_plus_raw";
  }
  return undefined;
}

export function parseProtocolPart(value: string | undefined) {
  if (!value) return {};
  const match = value.match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) return {};
  return {
    partIndex: Number(match[1]),
    totalParts: Number(match[2]),
  };
}

export function extractTaskProtocolEvents(text: string): TaskProtocolEvent[] {
  if (!text.trim()) return [];

  const events: TaskProtocolEvent[] = [];
  const sanitized = text
    .replace(TASK_BLOCK_REGEX, "")
    .replace(INFO_BLOCK_REGEX, "");

  for (const match of sanitized.matchAll(BLOCK_REGEX)) {
    const blockType = normalizeTaskProtocolEventType(match[1]);
    if (!blockType) continue;

    const fields = parseProtocolBlockFields(match[2] ?? "");
    const parsedPart = parseProtocolPart(fields.PART);
    const body =
      fields.BODY || fields.SEARCH_GOAL || fields.SUMMARY || "";

    events.push({
      type: blockType,
      taskId: fields.TASK_ID || undefined,
      actionId: fields.ACTION_ID || fields.REQUEST_ID || undefined,
      status: fields.STATUS || undefined,
      body,
      required: parseProtocolRequired(fields.REQUIRED),
      summary: fields.SUMMARY || undefined,
      query: fields.QUERY || undefined,
      url: fields.URL || undefined,
      searchEngine: fields.ENGINE || undefined,
      searchLocation: fields.LOCATION || undefined,
      outputMode: parseProtocolSearchOutputMode(fields.OUTPUT_MODE),
      rawResultId: fields.RAW_RESULT_ID || undefined,
      libraryItemId: fields.LIBRARY_ITEM_ID || undefined,
      partIndex: parsedPart.partIndex,
      totalParts: parsedPart.totalParts,
      characters: fields.CHARACTERS
        ? Number(fields.CHARACTERS) || undefined
        : undefined,
    });
  }

  return events;
}
