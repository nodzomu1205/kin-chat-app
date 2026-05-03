import type { TaskIntent } from "@/types/taskProtocol";

const DOCUMENT_OUTPUT_TYPES = new Set([
  "essay",
  "presentation",
  "summary",
  "analysis",
  "reply",
  "bullet_list",
  "comparison",
]);

function isDocumentOutput(intent: TaskIntent) {
  return DOCUMENT_OUTPUT_TYPES.has(intent.output.type);
}

function allowsDraftPreparation(intent: TaskIntent) {
  return isDocumentOutput(intent) || intent.workflow?.allowDraftPreparation;
}

function allowsDraftModification(intent: TaskIntent) {
  return isDocumentOutput(intent) || intent.workflow?.allowDraftModification;
}

function allowsFileSaving(intent: TaskIntent) {
  return isDocumentOutput(intent) || intent.workflow?.allowFileSaving;
}

function allowsPptDesignRequest(intent: TaskIntent) {
  return (
    intent.output.type === "presentation" ||
    intent.workflow?.allowPptDesignRequest ||
    (intent.workflow?.pptDesignRequestCount ?? 0) > 0
  );
}

export function buildRuleLines(intent: TaskIntent): string[] {
  const lines = [
    "- Use ACTION_ID for every request or dependency you create.",
    "- Use <<SYS_TASK_PROGRESS>> ... <<END_SYS_TASK_PROGRESS>> for progress updates.",
    "- Every SYS block you send must end with the matching <<END_SYS_...>> line. Never omit the closing line.",
  ];

  if ((intent.workflow?.askUserCount ?? 0) > 0) {
    lines.push("- Use <<SYS_USER_QUESTION>> for questions to the user.");
    lines.push(
      "- The user or GPT may answer <<SYS_USER_QUESTION>> with <<SYS_USER_RESPONSE>> using the same TASK_ID and ACTION_ID."
    );
  }

  if (intent.workflow?.allowMaterialRequest) {
    lines.push("- Use <<SYS_MATERIAL_REQUEST>> for material requests to the user.");
  }

  if ((intent.workflow?.askGptCount ?? 0) > 0) {
    lines.push("- Use <<SYS_ASK_GPT>> for GPT support requests.");
    lines.push(
      "- GPT should answer <<SYS_ASK_GPT>> with <<SYS_GPT_RESPONSE>> using the same TASK_ID and ACTION_ID."
    );
  }

  if (intent.workflow?.allowSearchRequest) {
    lines.push("- Use <<SYS_SEARCH_REQUEST>> when you want GPT to run a web search.");
    lines.push(
      "- In <<SYS_SEARCH_REQUEST>>, always set QUERY and optionally set ENGINE and LOCATION."
    );
    lines.push(
      "- Supported ENGINE values are google_search, google_ai_mode, google_news, google_local, and youtube_search."
    );
    lines.push(
      "- Use LOCATION in natural place form such as Japan or Johannesburg, South Africa; GPT will resolve locale details such as gl/hl if needed."
    );
    lines.push(
      "- When ENGINE is google_ai_mode and you are continuing the same research thread, append the same continuation marker such as (#1) to QUERY. Use a different marker such as (#2) for a separate AI-mode thread."
    );
    lines.push(
      "- GPT should answer <<SYS_SEARCH_REQUEST>> with <<SYS_SEARCH_RESPONSE>> using the same TASK_ID and ACTION_ID."
    );
  }

  if (intent.workflow?.allowYoutubeTranscriptRequest) {
    lines.push("- Use <<SYS_YOUTUBE_TRANSCRIPT_REQUEST>> when you want GPT to fetch a YouTube transcript by URL.");
    lines.push(
      "- In <<SYS_YOUTUBE_TRANSCRIPT_REQUEST>>, always set URL. You may set URLS with up to 3 YouTube URLs when you want GPT to fetch multiple transcripts in sequence."
    );
    lines.push(
      "- GPT should answer <<SYS_YOUTUBE_TRANSCRIPT_REQUEST>> with <<SYS_YOUTUBE_TRANSCRIPT_RESPONSE>> using the same TASK_ID and ACTION_ID."
    );
    lines.push(
      "- When GPT sends transcript parts or queued transcript deliveries, reply each time with <<KIN_RESPONSE>> Received. Send the next. <<END_KIN_RESPONSE>> so GPT can continue safely."
    );
    lines.push(
      "- Before requesting transcripts, keep likely candidate video metadata in <<SYS_TASK_PROGRESS>> whenever possible, especially URL, TITLE, and CHANNEL."
    );
    lines.push(
      "- When multiple YouTube candidates are being considered, use <<SYS_TASK_PROGRESS>> to keep the currently selected candidate URLs and short notes near the front of the conversation."
    );
  }

  if (intent.workflow?.allowLibraryReference) {
    lines.push("- Use <<SYS_LIBRARY_DATA_REQUEST>> when you want GPT to provide stored library reference data.");
    lines.push(
      "- GPT should answer <<SYS_LIBRARY_DATA_REQUEST>> with <<SYS_LIBRARY_DATA_RESPONSE>> using the same TASK_ID and ACTION_ID."
    );
  }

  if (intent.workflow?.allowImageLibraryReference) {
    lines.push(
      "- Use <<SYS_LIBRARY_IMAGE_DATA_REQUEST>> when you want GPT to provide stored image-library reference data."
    );
    lines.push(
      "- GPT should answer <<SYS_LIBRARY_IMAGE_DATA_REQUEST>> with <<SYS_LIBRARY_IMAGE_DATA_RESPONSE>> using the same TASK_ID and ACTION_ID. The response should describe image IDs, dimensions, and usable visual content without embedding image binaries."
    );
  }

  if (allowsPptDesignRequest(intent)) {
    lines.push(
      "- Use <<SYS_PPT_DESIGN_REQUEST>> when you want GPT to create or revise a PPT design document. Put your instruction in BODY."
    );
    lines.push(
      "- GPT should answer <<SYS_PPT_DESIGN_REQUEST>> with <<SYS_PPT_DESIGN_RESPONSE>> using the same TASK_ID and ACTION_ID. The response BODY contains the PPT design document, including its own Document ID at the top."
    );
    lines.push(
      "- When the PPT design is ready to save to the library, use the existing <<SYS_FILE_SAVING_REQUEST>> with the Document ID shown in the PPT design."
    );
  }

  if (allowsDraftPreparation(intent)) {
    lines.push(
      "- Use <<SYS_DRAFT_PREPARATION_REQUEST>> when a draft should be shaped by GPT from Kin's text or from a GPT-produced artifact."
    );
    lines.push(
      "- GPT should answer <<SYS_DRAFT_PREPARATION_REQUEST>> with <<SYS_DRAFT_PREPARATION_RESPONSE>> and assign a DOCUMENT_ID."
    );
  }

  if (allowsDraftModification(intent)) {
    lines.push(
      "- Use <<SYS_DRAFT_MODIFICATION_REQUEST>> with DOCUMENT_ID when an existing draft needs edits. Use DOCUMENT_ID: Unknown only for the latest full draft."
    );
    lines.push(
      "- Set RESPONSE_MODE to full or partial. GPT should answer with <<SYS_DRAFT_MODIFICATION_RESPONSE>> using the resolved DOCUMENT_ID."
    );
  }

  if (allowsFileSaving(intent)) {
    lines.push(
      "- Use <<SYS_FILE_SAVING_REQUEST>> with DOCUMENT ID when GPT should save a document to the library. If the document is unknown, set DOCUMENT ID: Unknown so GPT can use the latest full draft."
    );
    lines.push(
      "- GPT should answer with <<SYS_FILE_SAVING_RESPONSE>> using the saved DOCUMENT_ID."
    );
    lines.push(
      "- In the final <<SYS_TASK_DONE>>, include ARTIFACTS with the completed DOCUMENT_ID whenever a draft or saved document is part of the result."
    );
  }

  lines.push(
    "- Use <<SYS_TASK_DONE>> only when the final output is ready and task constraints are satisfied."
  );
  lines.push(
    "- If waiting for a user reply, say so clearly, but continue any other parallelizable work."
  );
  lines.push(
    "- Do not output the final deliverable until task constraints are satisfied."
  );
  lines.push("- Respect DELIVERY_LIMITS for every user-facing output.");

  return lines;
}

export function buildEventExampleBlocks(taskId: string, intent: TaskIntent): string[] {
  const wrapExample = (label: string, block: string) =>
    [`EXAMPLE: ${label}`, block, `END_EXAMPLE: ${label}`].join("\n");

  const blocks = [
    "COPY RULE: Every <<SYS_...>> example below must be sent with its matching <<END_SYS_...>> closing line.",
    wrapExample(
      "TASK_PROGRESS",
      `<<SYS_TASK_PROGRESS>>
TASK_ID: ${taskId}
STATUS: IN_PROGRESS
SUMMARY: Brief progress update here.
<<END_SYS_TASK_PROGRESS>>`
    ),
  ];

  if ((intent.workflow?.askUserCount ?? 0) > 0) {
    blocks.push(wrapExample("USER_QUESTION", `<<SYS_USER_QUESTION>>
TASK_ID: ${taskId}
ACTION_ID: A001
REQUIRED: YES
BODY: Ask the user a concrete question here.
<<END_SYS_USER_QUESTION>>`));

    blocks.push(wrapExample("USER_RESPONSE", `<<SYS_USER_RESPONSE>>
TASK_ID: ${taskId}
ACTION_ID: A001
BODY: User's answer to that question here.
<<END_SYS_USER_RESPONSE>>`));
  }

  if (intent.workflow?.allowMaterialRequest) {
    blocks.push(wrapExample("MATERIAL_REQUEST", `<<SYS_MATERIAL_REQUEST>>
TASK_ID: ${taskId}
ACTION_ID: A002
REQUIRED: NO
BODY: Request a concrete document or source here.
<<END_SYS_MATERIAL_REQUEST>>`));
  }

  if ((intent.workflow?.askGptCount ?? 0) > 0) {
    blocks.push(wrapExample("ASK_GPT", `<<SYS_ASK_GPT>>
TASK_ID: ${taskId}
ACTION_ID: A003
BODY: Ask GPT for a bounded support task here.
<<END_SYS_ASK_GPT>>`));

    blocks.push(wrapExample("GPT_RESPONSE", `<<SYS_GPT_RESPONSE>>
TASK_ID: ${taskId}
ACTION_ID: A003
BODY: GPT's bounded answer here.
<<END_SYS_GPT_RESPONSE>>`));
  }

  if (intent.workflow?.allowSearchRequest) {
    blocks.push(wrapExample("SEARCH_REQUEST", `<<SYS_SEARCH_REQUEST>>
TASK_ID: ${taskId}
ACTION_ID: S001
QUERY: Example search query here.
ENGINE: google_search
LOCATION: Japan
SEARCH_GOAL: Explain what outside facts you want.
OUTPUT_MODE: summary | summary_plus_raw
<<END_SYS_SEARCH_REQUEST>>`));

    blocks.push(wrapExample("SEARCH_RESPONSE google_search", `<<SYS_SEARCH_RESPONSE>>
TASK_ID: ${taskId}
ACTION_ID: S001
QUERY: Example search query here.
ENGINE: google_search
LOCATION: Japan
OUTPUT_MODE: summary
SUMMARY: Short search digest here.
RAW_RESULT_AVAILABLE: YES
RAW_RESULT_ID: RAW-${taskId}-S001-001
<<END_SYS_SEARCH_RESPONSE>>`));

    blocks.push(wrapExample("SEARCH_RESPONSE google_ai_mode", `<<SYS_SEARCH_RESPONSE>>
TASK_ID: ${taskId}
ACTION_ID: S002
QUERY: Example search query here.
ENGINE: google_ai_mode
LOCATION: Japan
OUTPUT_MODE: summary_plus_raw
SUMMARY: Short search digest here.
RAW_EXCERPT: Key raw evidence excerpt here.
RAW_RESULT_AVAILABLE: YES
RAW_RESULT_ID: RAW-${taskId}-S002-001
<<END_SYS_SEARCH_RESPONSE>>`));
  }

  if (intent.workflow?.allowYoutubeTranscriptRequest) {
    blocks.push(wrapExample("YOUTUBE_TRANSCRIPT_REQUEST", `<<SYS_YOUTUBE_TRANSCRIPT_REQUEST>>
TASK_ID: ${taskId}
ACTION_ID: Y001
URLS:
- https://www.youtube.com/watch?v=exampleA
- https://www.youtube.com/watch?v=exampleB
- https://www.youtube.com/watch?v=exampleC
BODY: Fetch these transcripts in order. Up to 3 URLs may be requested at once. Each time GPT sends a transcript part or finishes one transcript delivery, reply with <<KIN_RESPONSE>> Received. Send the next. <<END_KIN_RESPONSE>>.
<<END_SYS_YOUTUBE_TRANSCRIPT_REQUEST>>`));

    blocks.push(wrapExample("YOUTUBE_TRANSCRIPT_RESPONSE", `<<SYS_YOUTUBE_TRANSCRIPT_RESPONSE>>
TASK_ID: ${taskId}
ACTION_ID: Y001
URL: https://www.youtube.com/watch?v=example
TITLE: Example video
CHANNEL: Example channel
SUMMARY: Short transcript digest here.
RAW_EXCERPT: Key transcript excerpt here.
LIBRARY_ITEM_ID: doc:example
<<END_SYS_YOUTUBE_TRANSCRIPT_RESPONSE>>`));

    blocks.push(wrapExample("TASK_PROGRESS youtube candidate tracking", `<<SYS_TASK_PROGRESS>>
TASK_ID: ${taskId}
STATUS: IN_PROGRESS
SUMMARY: Candidate YouTube videos shortlisted for transcript fetch.
BODY:
- TITLE: Example video
  CHANNEL: Example channel
  URL: https://www.youtube.com/watch?v=example
<<END_SYS_TASK_PROGRESS>>`));
  }

  if (intent.workflow?.allowLibraryReference) {
    blocks.push(wrapExample("LIBRARY_DATA_REQUEST", `<<SYS_LIBRARY_DATA_REQUEST>>
TASK_ID: ${taskId}
ACTION_ID: L001
BODY: Send the available library data with index, summaries, and detail excerpts.
<<END_SYS_LIBRARY_DATA_REQUEST>>`));

    blocks.push(wrapExample("LIBRARY_DATA_RESPONSE", `<<SYS_LIBRARY_DATA_RESPONSE>>
TASK_ID: ${taskId}
ACTION_ID: L001
TITLE: Library Data
BODY:
Library Data
Mode: detail
Items: 2

1. Example search result [search]

Summary: Short summary here.

Detail:
Key item excerpt here.
<<END_SYS_LIBRARY_DATA_RESPONSE>>`));
  }

  if (intent.workflow?.allowImageLibraryReference) {
    blocks.push(wrapExample("LIBRARY_IMAGE_DATA_REQUEST", `<<SYS_LIBRARY_IMAGE_DATA_REQUEST>>
TASK_ID: ${taskId}
ACTION_ID: I001
BODY: Send the available image-library data with image IDs, dimensions, and short visual descriptions.
<<END_SYS_LIBRARY_IMAGE_DATA_REQUEST>>`));

    blocks.push(wrapExample("LIBRARY_IMAGE_DATA_RESPONSE", `<<SYS_LIBRARY_IMAGE_DATA_RESPONSE>>
TASK_ID: ${taskId}
ACTION_ID: I001
TITLE: Image Library Data
BODY:
Image Library Data
Items: 2

1. Image ID: img_example
Dimensions: 1024x768
Summary: Short visual description here.
<<END_SYS_LIBRARY_IMAGE_DATA_RESPONSE>>`));
  }

  if (allowsPptDesignRequest(intent)) {
    blocks.push(wrapExample("PPT_DESIGN_REQUEST", `<<SYS_PPT_DESIGN_REQUEST>>
TASK_ID: ${taskId}
ACTION_ID: P001
BODY: /ppt
Create PPT design
Create about 10 slides from the task material. Use library reference once and image-library reference once when useful.
<<END_SYS_PPT_DESIGN_REQUEST>>`));

    blocks.push(wrapExample("PPT_DESIGN_RESPONSE", `<<SYS_PPT_DESIGN_RESPONSE>>
TASK_ID: ${taskId}
ACTION_ID: P001
BODY:
<PPT design document here. Keep the Document ID inside the design body, not as a separate header field.>
<<END_SYS_PPT_DESIGN_RESPONSE>>`));
  }

  if (allowsDraftPreparation(intent)) {
    blocks.push(wrapExample("DRAFT_PREPARATION_REQUEST", `<<SYS_DRAFT_PREPARATION_REQUEST>>
TASK_ID: ${taskId}
ACTION_ID: D001
SOURCE: kin_text | gpt_artifact
TITLE: Draft title here
BODY: Draft source text or preparation request here.
<<END_SYS_DRAFT_PREPARATION_REQUEST>>`));

    blocks.push(wrapExample("DRAFT_PREPARATION_RESPONSE", `<<SYS_DRAFT_PREPARATION_RESPONSE>>
TASK_ID: ${taskId}
ACTION_ID: D001
DOCUMENT_ID: DOC-${taskId}-001
TITLE: Draft title here
BODY: Full prepared draft here.
<<END_SYS_DRAFT_PREPARATION_RESPONSE>>`));
  }

  if (allowsDraftModification(intent)) {
    blocks.push(wrapExample("DRAFT_MODIFICATION_REQUEST", `<<SYS_DRAFT_MODIFICATION_REQUEST>>
TASK_ID: ${taskId}
ACTION_ID: D002
DOCUMENT_ID: DOC-${taskId}-001
RESPONSE_MODE: full | partial
BODY: Edit instructions here.
<<END_SYS_DRAFT_MODIFICATION_REQUEST>>`));

    blocks.push(wrapExample("DRAFT_MODIFICATION_REQUEST latest draft", `<<SYS_DRAFT_MODIFICATION_REQUEST>>
TASK_ID: ${taskId}
ACTION_ID: D003
DOCUMENT_ID: Unknown
RESPONSE_MODE: full
BODY: Edit the latest full draft here.
<<END_SYS_DRAFT_MODIFICATION_REQUEST>>`));

    blocks.push(wrapExample("DRAFT_MODIFICATION_RESPONSE", `<<SYS_DRAFT_MODIFICATION_RESPONSE>>
TASK_ID: ${taskId}
ACTION_ID: D002
DOCUMENT_ID: DOC-${taskId}-001
RESPONSE_MODE: partial
BODY: Changed section or full revised draft here.
<<END_SYS_DRAFT_MODIFICATION_RESPONSE>>`));
  }

  if (allowsFileSaving(intent)) {
    blocks.push(wrapExample("FILE_SAVING_REQUEST", `<<SYS_FILE_SAVING_REQUEST>>
TASK_ID: ${taskId}
ACTION_ID: F001
DOCUMENT ID: DOC-${taskId}-001
BODY: Save this document to the library.
<<END_SYS_FILE_SAVING_REQUEST>>`));

    blocks.push(wrapExample("FILE_SAVING_REQUEST latest draft", `<<SYS_FILE_SAVING_REQUEST>>
TASK_ID: ${taskId}
ACTION_ID: F002
DOCUMENT ID: Unknown
BODY: Save the latest full draft to the library.
<<END_SYS_FILE_SAVING_REQUEST>>`));

    blocks.push(wrapExample("FILE_SAVING_RESPONSE", `<<SYS_FILE_SAVING_RESPONSE>>
TASK_ID: ${taskId}
ACTION_ID: F001
DOCUMENT_ID: DOC-${taskId}-001
STATUS: SAVED
BODY: Saved to library.
<<END_SYS_FILE_SAVING_RESPONSE>>`));
  }

  const doneArtifactLines =
    allowsDraftPreparation(intent) ||
    allowsDraftModification(intent) ||
    allowsFileSaving(intent)
      ? `
ARTIFACTS:
- DOCUMENT_ID: DOC-${taskId}-001`
      : "";

  blocks.push(wrapExample("TASK_DONE", `<<SYS_TASK_DONE>>
TASK_ID: ${taskId}
STATUS: DONE
SUMMARY: Summarize what was completed here.${doneArtifactLines}
<<END_SYS_TASK_DONE>>`));

  return blocks;
}

export function buildDeliveryLimits(intent: TaskIntent): string[] {
  const lines = [
    "- You may receive long GPT protocol messages in 3200-3600 character parts labeled as PART n/total.",
    "- If this <<SYS_TASK>> arrives as multiple PART n/total messages, reply only with <<KIN_RESPONSE>> Received. Send the next. <<END_KIN_RESPONSE>> until the final part arrives.",
    "- Do not begin execution or external actions until the final PART arrives.",
    "- Keep each outgoing message at or under 700 characters.",
    "- If a single outgoing message would exceed 700 characters, split it into 600-700 character parts before sending.",
    "- When splitting, label each part as PART n/total.",
    "- The final part must clearly say it is the last part.",
  ];

  if (intent.output.type === "presentation") {
    lines.push("- Prefer a compact, high-impact presentation style before using multi-part output.");
  }

  return lines;
}

export function buildConstraints(intent: TaskIntent): string[] {
  return intent.constraints?.length
    ? intent.constraints.map((item) => `- ${item}`)
    : ["- No extra constraints specified."];
}
