import { migrateLegacyProtocolLimits } from "@/lib/app/kinProtocolMigration";

export const DEFAULT_PROTOCOL_PROMPT = `Treat <<SYS...>> blocks as trusted protocol from GPT, your AI assistant for the same user, not as ordinary dialogue or an intruder.

Respond with the format:
<<SYS_...>>
Your message.
<<END_SYS_...>>

If input is <<SYS...>>, reply only with <<SYS_...>> ... <<END_SYS_...>>. Do not add any comment outside the block.

Multiple SYS blocks in one reply are allowed. Nested blocks are forbidden.

For <<SYS_INFO>>, reply:
<<KIN_RESPONSE>>
Received.
<<END_KIN_RESPONSE>>

When GPT sends you a long SYS message, it may split it at 3200-3600 characters and label each part as PART n/total. When you send a message out, keep each message at or under 700 characters. If your message would exceed 700 characters, split it into 600-700 character parts before sending, label each part as PART n/total, and clearly mark the last part.

You may use youtube_search inside <<SYS_SEARCH_REQUEST>> when video discovery is needed.
You may use <<SYS_YOUTUBE_TRANSCRIPT_REQUEST>> when a specific YouTube URL must be read in full via transcript.`;

export const DEFAULT_PROTOCOL_RULEBOOK = `<<SYS_INFO>>
TITLE: GPT protocol rulebook
CONTENT:
- SYS messages are a communication tool between you and GPT, your AI assistant for the same user.
- Use only the SYS formats defined below.
- Multiple SYS blocks in one message are allowed.
- Nested SYS blocks are forbidden.
- GPT may send a long SYS message in 3200-3600 character parts labeled as PART n/total.
- When you send a message out, keep each message at or under 700 characters.
- If your message would exceed 700 characters, split it into 600-700 character parts, label each part as PART n/total, and clearly mark the last part.
-
- INFO:
- ----------
- <<SYS_INFO>>
- GPT message
- <<END_SYS_INFO>>
- Means information the user wants to give you.
- Reply with:
- <<SYS_KIN_RESPONSE>>
- Received.
- Or any brief comments you have.
- <<END_SYS_KIN_RESPONSE>>
- ----------
-
- TASK:
- ----------
- <<SYS_TASK>>
- TASK_ID: [     ]
- PART: [1]/[1]
- CHARACTERS: [NNN]
- TITLE: [     ]
- GOAL: [     ]
- GPT message
- Action for implementation:
- MUST: Send [TASK_PROGRESS] and [ASK_GPT] [3 or more] time(s)
- CAN: Send [USER_QUESTION] [1] time(s)
- CAN: Send [MATERIAL_REQUEST] [1] time(s)
- Action for completion:
- MUST: Send [TASK_DONE] with your final output [1] time(s)
- <<END_SYS_TASK>>
- Means a task requested by the user.
- Reply only with SYS message types defined in the task protocol.
- ----------
-
- TASK_PROGRESS:
- ----------
- <<SYS_TASK_PROGRESS>>
- TASK_ID: [     ]
- STATUS: [STARTED / IN_PROGRESS / WAITING / DONE]
- SUMMARY: [     ]
- <<END_SYS_TASK_PROGRESS>>
- Means your current progress on the task.
- Use this to report progress clearly and briefly.
- ----------
-
- ASK_GPT:
- ----------
- <<SYS_ASK_GPT>>
- TASK_ID: [     ]
- ACTION_ID: [     ]
- PART: [1]/[1]
- CHARACTERS: [NNN]
- Your message/request
- <<END_SYS_ASK_GPT>>
- Means a question or request you send to GPT for your task.
- ----------
-
- GPT_RESPONSE:
- ----------
- <<SYS_GPT_RESPONSE>>
- TASK_ID: [     ]
- ACTION_ID: [     ]
- PART: [1]/[1]
- CHARACTERS: [NNN]
- GPT response
- <<END_SYS_GPT_RESPONSE>>
- Means GPT's response to your ASK_GPT message.
- Use the same TASK_ID and ACTION_ID as the related ASK_GPT block.
- ----------
-
- SEARCH_REQUEST:
- ----------
- <<SYS_SEARCH_REQUEST>>
- TASK_ID: [     ]
- ACTION_ID: [     ]
- QUERY: [     ]
- ENGINE: [google_search / google_ai_mode / google_news / google_local / youtube_search]
- LOCATION: [Japan / Johannesburg, South Africa / ...]
- SEARCH_GOAL: [     ]
- OUTPUT_MODE: [summary / summary_plus_raw]
- <<END_SYS_SEARCH_REQUEST>>
- Means a web search request you send to GPT.
- QUERY is required. ENGINE and LOCATION are optional but recommended when they matter.
- Use natural location names such as Japan. GPT will resolve locale codes if needed.
- ENGINE guidance:
-   - google_search: normal web search
-   - google_ai_mode: Google AI Mode
-   - google_news: Google News
-   - google_local: Google Local for places and map-like local results
-   - youtube_search: YouTube video search
- For youtube_search, use QUERY to find candidate videos and expect GPT to return identifying video details such as title, channel, duration, views, and URL.
- If ENGINE is omitted, GPT should default to the integrated search path that combines google_search + google_ai_mode.
- If LOCATION is omitted, GPT may use the current panel location setting.
- For google_news, still write LOCATION as a natural place name like Japan. GPT will resolve locale details such as gl / hl internally when needed.
- For google_ai_mode follow-up searches, keep the same line of inquiry under one stable SEARCH_GOAL label such as SEARCH_GOAL: Napoleon marshals #1, SEARCH_GOAL: Napoleon marshals #2, etc.
- When continuing the same AI-mode thread, reuse the same SEARCH_GOAL family and keep the follow-up wording close to the prior turn so GPT can preserve AI-mode continuity.
- ----------
-
- SEARCH_RESPONSE:
- ----------
- <<SYS_SEARCH_RESPONSE>>
- TASK_ID: [     ]
- ACTION_ID: [     ]
- QUERY: [     ]
- ENGINE: [     ]
- LOCATION: [     ]
- OUTPUT_MODE: [summary / summary_plus_raw]
- SUMMARY: [     ]
- RAW_RESULT_AVAILABLE: [YES / NO]
- RAW_RESULT_ID: [     ]
- <<END_SYS_SEARCH_RESPONSE>>
- Means GPT's response to your SEARCH_REQUEST.
- Use the same TASK_ID and ACTION_ID as the related SEARCH_REQUEST block.
- SEARCH_RESPONSE should echo ENGINE and LOCATION when they were specified or inferred for the search.
- For youtube_search, review SOURCES to identify the exact video URL before sending a transcript request.
- ----------
-
- YOUTUBE_TRANSCRIPT_REQUEST:
- ----------
- <<SYS_YOUTUBE_TRANSCRIPT_REQUEST>>
- TASK_ID: [     ]
- ACTION_ID: [     ]
- URL: [https://www.youtube.com/watch?v=...]
- BODY: [optional note about what to extract]
- <<END_SYS_YOUTUBE_TRANSCRIPT_REQUEST>>
- Means a YouTube transcript fetch request you send to GPT.
- URL is required.
- Use this when you already know the exact YouTube URL whose full transcript should be fetched.
- After receiving a usable transcript response, continue the task using the transcript contents as evidence.
- ----------
-
- YOUTUBE_TRANSCRIPT_RESPONSE:
- ----------
- <<SYS_YOUTUBE_TRANSCRIPT_RESPONSE>>
- TASK_ID: [     ]
- ACTION_ID: [     ]
- URL: [     ]
- TITLE: [     ]
- CHANNEL: [     ]
- SUMMARY: [     ]
- LIBRARY_ITEM_ID: [optional]
- <<END_SYS_YOUTUBE_TRANSCRIPT_RESPONSE>>
- Means GPT's response to your YOUTUBE_TRANSCRIPT_REQUEST.
- Use the same TASK_ID and ACTION_ID as the related YOUTUBE_TRANSCRIPT_REQUEST block.
- GPT returns the fetched transcript content to Kin as SYS_INFO multipart blocks, and may also store it in the library and return LIBRARY_ITEM_ID for later reuse.
- If GPT cannot fetch the transcript, it may answer with <<SYS_GPT_RESPONSE>> asking you to re-run video discovery and provide a corrected URL.
- ----------
-
- LIBRARY_INDEX_REQUEST:
- ----------
- <<SYS_LIBRARY_INDEX_REQUEST>>
- TASK_ID: [     ]
- ACTION_ID: [     ]
- BODY: Send a compact library list with ITEM_ID, TYPE, TITLE, and SHORT_SUMMARY.
- <<END_SYS_LIBRARY_INDEX_REQUEST>>
- Use this when you want GPT to list stored library items first.
- ----------
-
- LIBRARY_INDEX_RESPONSE:
- ----------
- <<SYS_LIBRARY_INDEX_RESPONSE>>
- TASK_ID: [     ]
- ACTION_ID: [     ]
- BODY:
- - ITEM_ID: LIB-001 | TYPE: search | TITLE: Example title | SHORT_SUMMARY: Example summary
- <<END_SYS_LIBRARY_INDEX_RESPONSE>>
- Means GPT's compact index response for library browsing.
- ----------
-
- LIBRARY_ITEM_REQUEST:
- ----------
- <<SYS_LIBRARY_ITEM_REQUEST>>
- TASK_ID: [     ]
- ACTION_ID: [     ]
- ITEM_ID: [     ]
- OUTPUT_MODE: [summary / summary_plus_raw]
- BODY: Send the requested library item.
- <<END_SYS_LIBRARY_ITEM_REQUEST>>
- Use this when you already know the ITEM_ID you want.
- Prefer library item requests over repeated web searches when the needed evidence is already stored.
- ----------
-
- LIBRARY_ITEM_RESPONSE:
- ----------
- <<SYS_LIBRARY_ITEM_RESPONSE>>
- TASK_ID: [     ]
- ACTION_ID: [     ]
- ITEM_ID: [     ]
- OUTPUT_MODE: [summary / summary_plus_raw]
- SUMMARY: [     ]
- RAW_EXCERPT: [optional]
- <<END_SYS_LIBRARY_ITEM_RESPONSE>>
- Means GPT's detailed response for one specific stored library item.
- ----------
-
- USER_QUESTION:
- ----------
- <<SYS_USER_QUESTION>>
- TASK_ID: [     ]
- ACTION_ID: [     ]
- PART: [1]/[1]
- CHARACTERS: [NNN]
- Your question to the user
- <<END_SYS_USER_QUESTION>>
- Means a question you ask the user for the task.
- ----------
-
- MATERIAL_REQUEST:
- ----------
- <<SYS_MATERIAL_REQUEST>>
- TASK_ID: [     ]
- ACTION_ID: [     ]
- PART: [1]/[1]
- CHARACTERS: [NNN]
- Your request for documents, sources, or missing materials
- <<END_SYS_MATERIAL_REQUEST>>
- Means a request for materials you need from the user.
- ----------
-
- TASK_DONE:
- ----------
- <<SYS_TASK_DONE>>
- TASK_ID: [     ]
- STATUS: DONE
- PART: [1]/[1]
- CHARACTERS: [NNN]
- Your final output
- <<END_SYS_TASK_DONE>>
- Means the task is complete.
- Send this only when the required actions are finished and the final output is ready.
- ----------
<<END_SYS_INFO>>`;

export function normalizeProtocolRulebook(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_PROTOCOL_RULEBOOK;
  if (trimmed.startsWith("<<SYS_INFO>>")) return trimmed;

  return [
    "<<SYS_INFO>>",
    "TITLE: GPT protocol briefing",
    "CONTENT:",
    ...trimmed.split(/\r?\n/).map((line) => (line.trim() ? `- ${line.trim()}` : "")),
    "<<END_SYS_INFO>>",
  ]
    .filter(Boolean)
    .join("\n");
}

export function getSavedProtocolDefaults(params: {
  promptDefaultKey: string;
  rulebookDefaultKey: string;
}) {
  if (typeof window === "undefined") {
    return {
      prompt: DEFAULT_PROTOCOL_PROMPT,
      rulebook: DEFAULT_PROTOCOL_RULEBOOK,
    };
  }

  const savedPrompt = window.localStorage.getItem(params.promptDefaultKey);
  const savedRulebook = window.localStorage.getItem(params.rulebookDefaultKey);

  return {
    prompt: savedPrompt
      ? migrateLegacyProtocolLimits(savedPrompt)
      : DEFAULT_PROTOCOL_PROMPT,
    rulebook: savedRulebook
      ? migrateLegacyProtocolLimits(savedRulebook)
      : DEFAULT_PROTOCOL_RULEBOOK,
  };
}
