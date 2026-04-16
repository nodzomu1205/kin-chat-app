import type { ReferenceLibraryItem, SourceItem } from "@/types/chat";
import type { SearchRecord } from "@/lib/app/sendToGptFlowTypes";

export function buildAskGptRequestBlock(params: {
  taskId: string;
  actionId: string;
  body: string;
}) {
  return [
    "You are responding to a Kindroid SYS_ASK_GPT request.",
    "Return only this exact block format and nothing outside it:",
    "<<SYS_GPT_RESPONSE>>",
    `TASK_ID: ${params.taskId}`,
    `ACTION_ID: ${params.actionId}`,
    "BODY: <your answer>",
    "<<END_SYS_GPT_RESPONSE>>",
    "",
    "Request:",
    params.body,
  ].join("\n");
}

export function buildUserResponseRequestBlock(params: {
  taskId: string;
  actionId: string;
  originalQuestion: string;
  answerBody: string;
}) {
  return [
    "You are converting a user's plain answer into a Kindroid protocol response.",
    "Return only this exact block format and nothing outside it:",
    "<<SYS_USER_RESPONSE>>",
    `TASK_ID: ${params.taskId}`,
    `ACTION_ID: ${params.actionId}`,
    "BODY: <clean answer for Kindroid here>",
    "<<END_SYS_USER_RESPONSE>>",
    "",
    "Original Kindroid question:",
    params.originalQuestion,
    "",
    "User answer:",
    params.answerBody,
  ].join("\n");
}

export function buildSearchRequestInstruction(params: {
  taskId: string;
  actionId: string;
  query: string;
  engine: string;
  location: string;
  requestedMode: string;
  goal: string;
}) {
  const modeInstruction =
    params.requestedMode === "raw"
      ? "Prefer raw evidence excerpts and keep synthesis minimal."
      : params.requestedMode === "summary_plus_raw"
        ? "Return both a concise synthesis and a compact raw evidence excerpt."
        : "Return a concise synthesis only.";

  return [
    "You are responding to a Kindroid SYS_SEARCH_REQUEST.",
    "Use the provided search evidence seriously and return only this exact block format:",
    "<<SYS_SEARCH_RESPONSE>>",
    `TASK_ID: ${params.taskId}`,
    `ACTION_ID: ${params.actionId}`,
    `QUERY: ${params.query}`,
    `ENGINE: ${params.engine}`,
    `LOCATION: ${params.location}`,
    `OUTPUT_MODE: ${params.requestedMode}`,
    "SUMMARY:",
    "<search summary here>",
    "SOURCES:",
    "- <title> | <url>",
    "RAW_RESULT_AVAILABLE: YES",
    "RAW_RESULT_ID: <raw result id here>",
    "<<END_SYS_SEARCH_RESPONSE>>",
    "",
    modeInstruction,
    "",
    "Search goal:",
    params.goal,
  ].join("\n");
}

export function buildLibraryIndexResponseDraft(params: {
  taskId: string;
  actionId: string;
  referenceLibraryItems: ReferenceLibraryItem[];
  libraryIndexResponseCount: number;
}) {
  const lines = [
    "<<SYS_LIBRARY_INDEX_RESPONSE>>",
    `TASK_ID: ${params.taskId}`,
    `ACTION_ID: ${params.actionId}`,
    "BODY:",
  ];

  const compactItems = params.referenceLibraryItems.slice(
    0,
    Math.max(1, params.libraryIndexResponseCount || 1)
  );
  if (compactItems.length === 0) {
    lines.push("- No library items are currently available.");
  } else {
    compactItems.forEach((item) => {
      lines.push(
        `- ITEM_ID: ${item.id} | TYPE: ${item.itemType} | TITLE: ${item.title} | SHORT_SUMMARY: ${item.summary}`
      );
    });
  }

  lines.push("<<END_SYS_LIBRARY_INDEX_RESPONSE>>");
  return lines.join("\n");
}

export function buildLibraryItemResponseDraft(params: {
  taskId: string;
  actionId: string;
  rawText: string;
  referenceLibraryItems: ReferenceLibraryItem[];
}) {
  const itemIdMatch = params.rawText.match(/ITEM_ID:\s*([A-Za-z0-9:_-]+)/i);
  const requestedItemId = itemIdMatch?.[1]?.trim() || "";
  const requestedModeMatch = params.rawText.match(
    /OUTPUT_MODE:\s*(summary|summary_plus_raw|raw)/i
  );
  const requestedMode = requestedModeMatch?.[1]?.trim().toLowerCase() || "summary";
  const item = params.referenceLibraryItems.find(
    (candidate) => candidate.id === requestedItemId
  );

  const lines = [
    "<<SYS_LIBRARY_ITEM_RESPONSE>>",
    `TASK_ID: ${params.taskId}`,
    `ACTION_ID: ${params.actionId}`,
    `ITEM_ID: ${requestedItemId || item?.id || ""}`,
    `OUTPUT_MODE: ${requestedMode === "raw" ? "summary_plus_raw" : requestedMode}`,
  ];

  if (!item) {
    lines.push("SUMMARY: Requested library item was not found.");
  } else {
    lines.push(`SUMMARY: ${item.summary}`);
    if (requestedMode !== "summary" && item.excerptText.trim()) {
      lines.push(`RAW_EXCERPT: ${item.excerptText.trim().slice(0, 1400)}`);
    }
  }

  lines.push("<<END_SYS_LIBRARY_ITEM_RESPONSE>>");
  return lines.join("\n");
}

export function buildSearchResponseBlock(params: {
  taskId: string;
  actionId: string;
  query: string;
  engine: string;
  location: string;
  requestedMode: string;
  recordedSearch: SearchRecord | null;
  summaryText: string;
  rawExcerpt: string;
  wrappedOutputMode?: string;
  sourceLines: string[];
}) {
  const responseLines = [
    "<<SYS_SEARCH_RESPONSE>>",
    `TASK_ID: ${params.taskId}`,
    `ACTION_ID: ${params.actionId}`,
    `QUERY: ${params.query}`,
    `ENGINE: ${params.engine}`,
    `LOCATION: ${params.location}`,
    `OUTPUT_MODE: ${params.wrappedOutputMode || params.requestedMode}`,
    `RAW_RESULT_AVAILABLE: ${params.recordedSearch ? "YES" : "NO"}`,
    ...(params.recordedSearch ? [`RAW_RESULT_ID: ${params.recordedSearch.rawResultId}`] : []),
  ];

  if (params.requestedMode !== "raw") {
    responseLines.push("SUMMARY:", params.summaryText);
  } else {
    responseLines.push("SUMMARY:", "Raw-focused search response. See RAW_EXCERPT below.");
  }

  const shouldIncludeSources =
    params.requestedMode !== "summary" || params.engine === "youtube_search";

  if (shouldIncludeSources) {
    responseLines.push(
      "SOURCES:",
      ...(params.sourceLines.length > 0 ? params.sourceLines : ["- none"])
    );
  }

  if (
    (params.requestedMode === "raw" || params.requestedMode === "summary_plus_raw") &&
    params.rawExcerpt
  ) {
    responseLines.push("RAW_EXCERPT:", params.rawExcerpt);
  }

  responseLines.push("<<END_SYS_SEARCH_RESPONSE>>");
  return responseLines.join("\n");
}

export function buildProtocolSourceLines(
  sources: SourceItem[],
  engine: string
): string[] {
  return sources.slice(0, 5).map((source) => {
    if (engine === "youtube_search") {
      return [
        `- ${source.title || "Untitled"}`,
        source.channelName ? `  Channel: ${source.channelName}` : "",
        source.duration ? `  Duration: ${source.duration}` : "",
        source.viewCount ? `  Views: ${Number(source.viewCount).toLocaleString()} views` : "",
        source.link ? `  URL: ${source.link}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    }

    return `- ${source.title || "Untitled"}${source.link ? ` | ${source.link}` : ""}`;
  });
}

export function buildYouTubeTranscriptResponseBlock(params: {
  taskId: string;
  actionId: string;
  url: string;
  outputMode: string;
  title: string;
  channel: string;
  summary: string;
  rawExcerpt?: string;
  libraryItemId?: string;
}) {
  const lines = [
    "<<SYS_YOUTUBE_TRANSCRIPT_RESPONSE>>",
    `TASK_ID: ${params.taskId}`,
    `ACTION_ID: ${params.actionId}`,
    `URL: ${params.url}`,
    `OUTPUT_MODE: ${params.outputMode}`,
    `TITLE: ${params.title}`,
    `CHANNEL: ${params.channel}`,
    "SUMMARY:",
    params.summary,
  ];

  if (params.rawExcerpt) {
    lines.push("RAW_EXCERPT:", params.rawExcerpt);
  }

  if (params.libraryItemId) {
    lines.push(`LIBRARY_ITEM_ID: ${params.libraryItemId}`);
  }

  lines.push("<<END_SYS_YOUTUBE_TRANSCRIPT_RESPONSE>>");
  return lines.join("\n");
}
