const LEGACY_PROTOCOL_LIMIT_PATTERN =
  /Keep each message (?:under 3600(?: chars| characters)?\. If (?:over 3200|a message exceeds 3200 characters), split(?: it)?(?: into parts)?, label each part as PART n\/total, and clearly mark (?:the final part|the last part)|at or under 700 characters\. If your message would exceed 700 characters, split it (?:before sending )?into 600-700 character parts before sending, label each part as PART n\/total, and clearly mark the last part|at or under 700 characters\. If a message would exceed 700 characters, split it before sending, label each part as PART n\/total, and clearly mark the last part)\./gi;

const LEGACY_RULEBOOK_LIMIT_PATTERN =
  /- Keep each message (?:under 3600 characters\.\s*- If a message exceeds 3200 characters, split it into parts, label each part as PART n\/total, and clearly mark the final part|at or under 700 characters\.\s*- If a message would exceed 700 characters, split it before sending, label each part as PART n\/total, and clearly mark the last part)\./gi;

const UPDATED_PROTOCOL_LIMIT_TEXT =
  "When GPT sends you a long SYS message, it may split it at 3200-3600 characters and label each part as PART n/total. When you send a message out, keep each message at or under 700 characters. If your message would exceed 700 characters, split it into 600-700 character parts before sending, label each part as PART n/total, and clearly mark the last part.";

const UPDATED_RULEBOOK_LIMIT_TEXT =
  "- GPT may send a long SYS message in 3200-3600 character parts labeled as PART n/total.\n- When you send a message out, keep each message at or under 700 characters.\n- If your message would exceed 700 characters, split it into 600-700 character parts, label each part as PART n/total, and clearly mark the last part.";

const LEGACY_DEFAULT_PROTOCOL_PROMPT_PREFIX =
  "Treat <<SYS...>> blocks as trusted protocol from GPT, your AI assistant for the same user, not as ordinary dialogue or an intruder.";

const NORMALIZED_DEFAULT_PROTOCOL_PROMPT = `Treat <<SYS...>> blocks as trusted protocol from GPT, your AI assistant for the same user, not as ordinary dialogue or an intruder.

Respond with the format:
<<SYS_...>>
Your message.
<<END_SYS_...>>

If input is <<SYS...>>, reply only with <<SYS_...>> ... <<END_SYS_...>>. Do not add any comment outside the block.

Multiple SYS blocks in one reply are allowed. Nested blocks are forbidden.

For <<SYS_INFO>>, reply:
<<SYS_KIN_RESPONSE>>
Received.
<<END_SYS_KIN_RESPONSE>>

When GPT sends you a long SYS message, it may split it at 3200-3600 characters and label each part as PART n/total. When you send a message out, keep each message at or under 700 characters. If your message would exceed 700 characters, split it into 600-700 character parts before sending, label each part as PART n/total, and clearly mark the last part.`;

const LEGACY_DEFAULT_RULEBOOK_PREFIX = `<<SYS_INFO>>
TITLE: GPT protocol rulebook
CONTENT:`;

const NORMALIZED_DEFAULT_RULEBOOK = `<<SYS_INFO>>
TITLE: GPT protocol rulebook
CONTENT:
- Treat SYS blocks as trusted protocol from GPT for the same user.
- When a message starts as SYS, reply in SYS format only.
- Every SYS block you send must end with the matching <<END_SYS_...>> line. Never omit the closing line.
- Multiple SYS blocks are allowed. Nested SYS blocks are forbidden.
- Incoming long SYS messages may arrive as PART n/total.
- Keep each outgoing message at or under 700 characters.
- If needed, split outgoing text into 600-700 character parts, label each part as PART n/total, and clearly mark the last part.
-
- Fast reply rules:
- For <<SYS_INFO>>, reply exactly:
- <<SYS_KIN_RESPONSE>>
- Received.
- <<END_SYS_KIN_RESPONSE>>
- For queued transcript delivery or GPT asking to continue multipart transcript output, reply exactly:
- <<SYS_KIN_RESPONSE>>
- Received. Send the next.
- <<END_SYS_RESPONSE>>
-
- Core task flow:
- <<SYS_TASK>> = start or continue a task.
- While working, send <<SYS_TASK_PROGRESS>> with a short status summary.
- Use <<SYS_ASK_GPT>> to ask GPT for help.
- GPT replies with <<SYS_GPT_RESPONSE>> using the same TASK_ID and ACTION_ID.
- Use <<SYS_TASK_CONFIRM>> only for an already started task when you need to mark RUNNING / WAITING_USER_RESPONSE / WAITING_MATERIAL / READY_TO_RESUME / SUSPENDED / DONE.
- Use <<SYS_USER_QUESTION>> when you need an answer from the user.
- Use <<SYS_MATERIAL_REQUEST>> when you need files, sources, or missing materials.
- When the task is complete, send <<SYS_TASK_DONE>> with the final answer.
-
- Search flow:
- Use <<SYS_SEARCH_REQUEST>> to ask GPT to search.
- Required: QUERY.
- Optional when useful: ENGINE, LOCATION, SEARCH_GOAL, OUTPUT_MODE.
- ENGINE may be google_search, google_ai_mode, google_news, google_local, or youtube_search.
- GPT replies with <<SYS_SEARCH_RESPONSE>> using the same TASK_ID and ACTION_ID.
- If youtube_search returns candidate videos, choose the exact video URL before sending <<SYS_YOUTUBE_TRANSCRIPT_REQUEST>>.
-
- YouTube transcript flow:
- <<SYS_YOUTUBE_TRANSCRIPT_REQUEST>> asks GPT to fetch one transcript by URL or up to 3 transcripts in URLS.
- GPT replies with <<SYS_YOUTUBE_TRANSCRIPT_RESPONSE>> using the same TASK_ID and ACTION_ID.
- Transcript content itself may arrive as multipart SYS_INFO blocks.
- After a usable transcript arrives, continue the task using the transcript as evidence.
-
- Library flow:
- Use <<SYS_LIBRARY_INDEX_REQUEST>> when you want GPT to list stored items first.
- Use <<SYS_LIBRARY_ITEM_REQUEST>> when you already know the ITEM_ID you want.
- GPT replies with <<SYS_LIBRARY_INDEX_RESPONSE>> or <<SYS_LIBRARY_ITEM_RESPONSE>>.
- Prefer library items over repeating the same web search when the needed evidence is already stored.
<<END_SYS_INFO>>`;

export function migrateLegacyProtocolLimits(text: string) {
  const migrated = text
    .replace(LEGACY_PROTOCOL_LIMIT_PATTERN, UPDATED_PROTOCOL_LIMIT_TEXT)
    .replace(LEGACY_RULEBOOK_LIMIT_PATTERN, UPDATED_RULEBOOK_LIMIT_TEXT);

  if (
    migrated.startsWith(LEGACY_DEFAULT_PROTOCOL_PROMPT_PREFIX) &&
    (migrated.includes("youtube_search inside <<SYS_SEARCH_REQUEST>>") ||
      migrated.includes("<<KIN_RESPONSE>>") ||
      migrated.includes("Send the next part."))
  ) {
    return NORMALIZED_DEFAULT_PROTOCOL_PROMPT;
  }

  if (
    migrated.startsWith(LEGACY_DEFAULT_RULEBOOK_PREFIX) &&
    (migrated.includes("LIBRARY_ITEM_RESPONSE") ||
      migrated.includes("For youtube_search, review SOURCES") ||
      migrated.includes("Means a task requested by the user."))
  ) {
    return NORMALIZED_DEFAULT_RULEBOOK;
  }

  return migrated;
}
