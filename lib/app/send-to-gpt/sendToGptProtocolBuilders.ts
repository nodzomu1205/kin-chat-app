import type { ReferenceLibraryItem, SourceItem } from "@/types/chat";
import { buildLibraryItemsAggregateText } from "@/lib/app/reference-library/libraryItemAggregation";
import {
  buildPresentationImageLibraryContext,
  getPresentationImageLibraryCandidates,
} from "@/lib/app/presentation/presentationImageLibrary";
import type { SearchRecord } from "@/lib/app/send-to-gpt/sendToGptFlowBaseTypes";
import {
  buildProtocolBlock,
  buildProtocolLine,
  buildProtocolSection,
} from "@/lib/shared/protocolBlockBuilders";

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

export function buildDraftPreparationRequestBlock(params: {
  taskId: string;
  actionId: string;
  body: string;
  title?: string;
}) {
  return [
    "You are responding to a Kindroid SYS_DRAFT_PREPARATION_REQUEST.",
    "Prepare a polished draft and assign a stable DOCUMENT_ID. Return only this exact block format:",
    "<<SYS_DRAFT_PREPARATION_RESPONSE>>",
    `TASK_ID: ${params.taskId}`,
    `ACTION_ID: ${params.actionId}`,
    "DOCUMENT_ID: DOC-<task-or-topic>-001",
    params.title ? `TITLE: ${params.title}` : "TITLE: <draft title>",
    "BODY:",
    "<full prepared draft>",
    "<<END_SYS_DRAFT_PREPARATION_RESPONSE>>",
    "",
    "Request/source:",
    params.body,
  ].join("\n");
}

export function buildDraftModificationRequestBlock(params: {
  taskId: string;
  actionId: string;
  documentId: string;
  responseMode?: "full" | "partial";
  body: string;
  documentTitle?: string;
  documentText?: string;
}) {
  const responseMode = params.responseMode || "full";
  const documentId =
    params.documentId.trim() || `DOC-${params.taskId || "draft"}-001`;
  const documentContext = params.documentText?.trim()
    ? [
        "",
        "Current document:",
        `DOCUMENT_ID: ${documentId}`,
        params.documentTitle ? `TITLE: ${params.documentTitle}` : "",
        "BODY:",
        params.documentText,
      ].filter(Boolean)
    : [
        "",
        "Current document:",
        `DOCUMENT_ID: ${documentId}`,
        "BODY: <referenced document was not found in recent draft responses>",
      ];

  return [
    "You are responding to a Kindroid SYS_DRAFT_MODIFICATION_REQUEST.",
    "Edit the referenced document according to the instruction. Return only this exact block format:",
    `Use exactly this DOCUMENT_ID in the response: ${documentId}. Never leave DOCUMENT_ID blank or Unknown.`,
    "<<SYS_DRAFT_MODIFICATION_RESPONSE>>",
    `TASK_ID: ${params.taskId}`,
    `ACTION_ID: ${params.actionId}`,
    `DOCUMENT_ID: ${documentId}`,
    `RESPONSE_MODE: ${responseMode}`,
    "BODY:",
    responseMode === "partial"
      ? "<only the changed section(s)>"
      : "<complete revised draft>",
    "<<END_SYS_DRAFT_MODIFICATION_RESPONSE>>",
    "",
    "Edit instruction:",
    params.body,
    ...documentContext,
  ].join("\n");
}

export function buildFileSaveRequestBlock(params: {
  taskId: string;
  actionId: string;
  documentId: string;
  body: string;
}) {
  return [
    "You are responding to a Kindroid SYS_FILE_SAVING_REQUEST.",
    "Save the referenced document into the library when available, and return only this exact block format:",
    "<<SYS_FILE_SAVING_RESPONSE>>",
    `TASK_ID: ${params.taskId}`,
    `ACTION_ID: ${params.actionId}`,
    `DOCUMENT_ID: ${params.documentId}`,
    "STATUS: SAVED | NEED_DOCUMENT",
    "BODY: <short save result>",
    "<<END_SYS_FILE_SAVING_RESPONSE>>",
    "",
    "Save instruction:",
    params.body,
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
    "Use the provided search evidence seriously and return only the goal-specific answer in this exact block format:",
    "Do not include SOURCES, RAW_EXCERPT, RAW_RESULT_AVAILABLE, or RAW_RESULT_ID. The app will attach the same library Summary/Detail that the user can see.",
    "<<SYS_SEARCH_RESPONSE>>",
    `TASK_ID: ${params.taskId}`,
    `ACTION_ID: ${params.actionId}`,
    `QUERY: ${params.query}`,
    `ENGINE: ${params.engine}`,
    `LOCATION: ${params.location}`,
    `OUTPUT_MODE: ${params.requestedMode}`,
    "SUMMARY:",
    "<answer for the search goal here>",
    "<<END_SYS_SEARCH_RESPONSE>>",
    "",
    modeInstruction,
    "",
    "Search goal:",
    params.goal,
  ].join("\n");
}

export function buildLibraryDataResponseDraft(params: {
  taskId: string;
  actionId: string;
  referenceLibraryItems: ReferenceLibraryItem[];
}) {
  const lines = [
    buildProtocolLine("TASK_ID", params.taskId),
    buildProtocolLine("ACTION_ID", params.actionId),
    "TITLE: Library Data",
    "BODY:",
  ];

  if (params.referenceLibraryItems.length === 0) {
    lines.push("- No library items are currently available.");
  } else {
    lines.push(
      buildLibraryItemsAggregateText({
        items: params.referenceLibraryItems,
        mode: "detail",
      })
    );
  }

  return buildProtocolBlock({
    name: "SYS_LIBRARY_DATA_RESPONSE",
    lines,
  });
}

export function buildLibraryIndexResponseDraft(params: {
  taskId: string;
  actionId: string;
  referenceLibraryItems: ReferenceLibraryItem[];
  libraryIndexResponseCount: number;
}) {
  return buildLibraryDataResponseDraft({
    taskId: params.taskId,
    actionId: params.actionId,
    referenceLibraryItems: params.referenceLibraryItems,
  });
}

export function buildLibraryItemResponseDraft(params: {
  taskId: string;
  actionId: string;
  rawText: string;
  referenceLibraryItems: ReferenceLibraryItem[];
}) {
  return buildLibraryDataResponseDraft({
    taskId: params.taskId,
    actionId: params.actionId,
    referenceLibraryItems: params.referenceLibraryItems,
  });
}

export function buildLibraryImageDataResponseDraft(params: {
  taskId: string;
  actionId: string;
  referenceLibraryItems: ReferenceLibraryItem[];
  imageLibraryReferenceCount: number;
}) {
  const imageContext = buildPresentationImageLibraryContext(
    getPresentationImageLibraryCandidates({
      enabled: true,
      referenceLibraryItems: params.referenceLibraryItems,
      count: params.imageLibraryReferenceCount,
    })
  );
  const lines = [
    buildProtocolLine("TASK_ID", params.taskId),
    buildProtocolLine("ACTION_ID", params.actionId),
    "TITLE: Image Library Data",
    "BODY:",
    imageContext || "- No image-library items are currently available.",
  ];

  return buildProtocolBlock({
    name: "SYS_LIBRARY_IMAGE_DATA_RESPONSE",
    lines,
  });
}

export function buildPptDesignRequestInstruction(params: {
  taskId: string;
  actionId: string;
  body: string;
}) {
  return [
    "You are responding to a Kindroid SYS_PPT_DESIGN_REQUEST.",
    "Create or revise a PPT design document by using the same meaning as this user-facing command:",
    "/ppt",
    "Create PPT design",
    "",
    "Return only this exact protocol block and nothing outside it:",
    "<<SYS_PPT_DESIGN_RESPONSE>>",
    `TASK_ID: ${params.taskId}`,
    `ACTION_ID: ${params.actionId}`,
    "BODY:",
    "<PPT design document here. Keep the Document ID inside the design document body; do not add a separate DOCUMENT_ID header to this protocol block.>",
    "<<END_SYS_PPT_DESIGN_RESPONSE>>",
    "",
    "Kin request:",
    params.body,
  ].join("\n");
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
    buildProtocolLine("TASK_ID", params.taskId),
    buildProtocolLine("ACTION_ID", params.actionId),
    buildProtocolLine("QUERY", params.query),
    buildProtocolLine("ENGINE", params.engine),
    buildProtocolLine("LOCATION", params.location),
    buildProtocolLine("OUTPUT_MODE", params.wrappedOutputMode || params.requestedMode),
    buildProtocolLine(
      "RAW_RESULT_AVAILABLE",
      params.recordedSearch ? "YES" : "NO"
    ),
    ...(params.recordedSearch
      ? [buildProtocolLine("RAW_RESULT_ID", params.recordedSearch.rawResultId)]
      : []),
  ];

  if (params.requestedMode !== "raw") {
    responseLines.push("SUMMARY:", params.summaryText);
  } else {
    responseLines.push("SUMMARY:", "Raw-focused search response. See RAW_EXCERPT below.");
  }

  const shouldIncludeSources =
    params.requestedMode !== "summary" && params.sourceLines.length > 0;

  if (shouldIncludeSources) {
    responseLines.push(
      ...buildProtocolSection("SOURCES:", params.sourceLines)
    );
  }

  if (
    (params.requestedMode === "raw" || params.requestedMode === "summary_plus_raw") &&
    params.rawExcerpt
  ) {
    responseLines.push("RAW_EXCERPT:", params.rawExcerpt);
  }

  return buildProtocolBlock({
    name: "SYS_SEARCH_RESPONSE",
    lines: responseLines,
  });
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
    buildProtocolLine("TASK_ID", params.taskId),
    buildProtocolLine("ACTION_ID", params.actionId),
    buildProtocolLine("URL", params.url),
    buildProtocolLine("OUTPUT_MODE", params.outputMode),
    buildProtocolLine("TITLE", params.title),
    buildProtocolLine("CHANNEL", params.channel),
    ...buildProtocolSection("SUMMARY:", [params.summary]),
  ];

  if (params.rawExcerpt) {
    lines.push("RAW_EXCERPT:", params.rawExcerpt);
  }

  if (params.libraryItemId) {
    lines.push(`LIBRARY_ITEM_ID: ${params.libraryItemId}`);
  }

  return buildProtocolBlock({
    name: "SYS_YOUTUBE_TRANSCRIPT_RESPONSE",
    lines,
  });
}
