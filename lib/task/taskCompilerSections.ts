import type { TaskIntent } from "@/types/taskProtocol";

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
    lines.push("- Use <<SYS_LIBRARY_INDEX_REQUEST>> when you want GPT to provide a compact library list.");
    lines.push(
      "- GPT should answer <<SYS_LIBRARY_INDEX_REQUEST>> with <<SYS_LIBRARY_INDEX_RESPONSE>> using the same TASK_ID and ACTION_ID."
    );
    lines.push("- Use <<SYS_LIBRARY_ITEM_REQUEST>> when you want GPT to provide one specific library item.");
    lines.push(
      "- GPT should answer <<SYS_LIBRARY_ITEM_REQUEST>> with <<SYS_LIBRARY_ITEM_RESPONSE>> using the same TASK_ID and ACTION_ID."
    );
    lines.push(
      "- Both library index requests and library item requests consume the same library-reference allowance for the task."
    );
    lines.push(
      "- Use <<SYS_LIBRARY_INDEX_REQUEST>> first when you need to discover available stored items, and <<SYS_LIBRARY_ITEM_REQUEST>> when you already know the ITEM_ID to inspect."
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
    blocks.push(wrapExample("LIBRARY_INDEX_REQUEST", `<<SYS_LIBRARY_INDEX_REQUEST>>
TASK_ID: ${taskId}
ACTION_ID: L001
BODY: Send a compact library list with ITEM_ID, TYPE, TITLE, and SHORT_SUMMARY.
<<END_SYS_LIBRARY_INDEX_REQUEST>>`));

    blocks.push(wrapExample("LIBRARY_INDEX_RESPONSE", `<<SYS_LIBRARY_INDEX_RESPONSE>>
TASK_ID: ${taskId}
ACTION_ID: L001
BODY:
- ITEM_ID: LIB-001 | TYPE: search | TITLE: Example search result | SHORT_SUMMARY: Short summary here.
- ITEM_ID: LIB-002 | TYPE: kin_created | TITLE: Example Kin document | SHORT_SUMMARY: Short summary here.
<<END_SYS_LIBRARY_INDEX_RESPONSE>>`));

    blocks.push(wrapExample("LIBRARY_ITEM_REQUEST", `<<SYS_LIBRARY_ITEM_REQUEST>>
TASK_ID: ${taskId}
ACTION_ID: L002
ITEM_ID: LIB-002
BODY: Send the requested library item in the configured detail level.
<<END_SYS_LIBRARY_ITEM_REQUEST>>`));

    blocks.push(wrapExample("LIBRARY_ITEM_RESPONSE", `<<SYS_LIBRARY_ITEM_RESPONSE>>
TASK_ID: ${taskId}
ACTION_ID: L002
ITEM_ID: LIB-002
OUTPUT_MODE: summary | summary_plus_raw
SUMMARY: Short item digest here.
RAW_EXCERPT: Key item excerpt here.
<<END_SYS_LIBRARY_ITEM_RESPONSE>>`));
  }

  blocks.push(wrapExample("TASK_DONE", `<<SYS_TASK_DONE>>
TASK_ID: ${taskId}
STATUS: DONE
SUMMARY: Summarize what was completed here.
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
