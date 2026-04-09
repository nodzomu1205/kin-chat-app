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

When GPT sends you a long SYS message, it may split it at 3200-3600 characters and label each part as PART n/total. When you send a message out, keep each message at or under 700 characters. If your message would exceed 700 characters, split it into 600-700 character parts before sending, label each part as PART n/total, and clearly mark the last part.`;

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
