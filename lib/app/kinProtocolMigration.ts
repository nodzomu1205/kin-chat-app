import {
  KIN_PROTOCOL_PROMPT,
  KIN_PROTOCOL_RULEBOOK,
} from "@/lib/app/kinProtocolText";

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

const LEGACY_DEFAULT_RULEBOOK_PREFIX = `<<SYS_INFO>>
TITLE: GPT protocol rulebook
CONTENT:`;

function looksMojibake(text: string) {
  return (
    text.includes("\uFFFD") ||
    /[\uFF66-\uFF9F]{3,}/.test(text) ||
    /[一-龯ぁ-んァ-ヶ][\uFF66-\uFF9F][一-龯ぁ-んァ-ヶ]/.test(text)
  );
}

function shouldResetToNormalizedPrompt(text: string) {
  return (
    text.startsWith(LEGACY_DEFAULT_PROTOCOL_PROMPT_PREFIX) &&
    (text.includes("youtube_search inside <<SYS_SEARCH_REQUEST>>") ||
      text.includes("<<KIN_RESPONSE>>") ||
      text.includes("Send the next part.") ||
      text.includes("<<SYS_KIN_RESPONSE>>"))
  );
}

function shouldResetToNormalizedRulebook(text: string) {
  return (
    text.startsWith(LEGACY_DEFAULT_RULEBOOK_PREFIX) &&
    (text.includes("LIBRARY_ITEM_RESPONSE") ||
      text.includes("For youtube_search, review SOURCES") ||
      text.includes("Means a task requested by the user.") ||
      text.includes("<<SYS_KIN_RESPONSE>>"))
  );
}

export function migrateLegacyProtocolLimits(text: string) {
  if (!text.trim()) return text;

  const migrated = text
    .replace(LEGACY_PROTOCOL_LIMIT_PATTERN, UPDATED_PROTOCOL_LIMIT_TEXT)
    .replace(LEGACY_RULEBOOK_LIMIT_PATTERN, UPDATED_RULEBOOK_LIMIT_TEXT)
    .replace(/<<SYS_KIN_RESPONSE>>/g, "<<KIN_RESPONSE>>")
    .replace(/<<END_SYS_KIN_RESPONSE>>/g, "<<END_KIN_RESPONSE>>")
    .replace(/<<END_SYS_RESPONSE>>/g, "<<END_KIN_RESPONSE>>");

  if (
    looksMojibake(migrated) &&
    !migrated.includes("<<SYS_INFO>>") &&
    !migrated.includes("<<SYS_...>>")
  ) {
    return KIN_PROTOCOL_PROMPT;
  }

  if (shouldResetToNormalizedPrompt(migrated)) {
    return KIN_PROTOCOL_PROMPT;
  }

  if (looksMojibake(migrated) && migrated.includes("<<SYS_INFO>>")) {
    return KIN_PROTOCOL_RULEBOOK;
  }

  if (shouldResetToNormalizedRulebook(migrated)) {
    return KIN_PROTOCOL_RULEBOOK;
  }

  return migrated;
}
