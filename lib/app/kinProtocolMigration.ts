const LEGACY_PROTOCOL_LIMIT_PATTERN =
  /Keep each message (?:under 3600(?: chars| characters)?\. If (?:over 3200|a message exceeds 3200 characters), split(?: it)?(?: into parts)?, label each part as PART n\/total, and clearly mark (?:the final part|the last part)|at or under 700 characters\. If your message would exceed 700 characters, split it (?:before sending )?into 600-700 character parts before sending, label each part as PART n\/total, and clearly mark the last part|at or under 700 characters\. If a message would exceed 700 characters, split it before sending, label each part as PART n\/total, and clearly mark the last part)\./gi;

const LEGACY_RULEBOOK_LIMIT_PATTERN =
  /- Keep each message (?:under 3600 characters\.\s*- If a message exceeds 3200 characters, split it into parts, label each part as PART n\/total, and clearly mark the final part|at or under 700 characters\.\s*- If a message would exceed 700 characters, split it before sending, label each part as PART n\/total, and clearly mark the last part)\./gi;

const UPDATED_PROTOCOL_LIMIT_TEXT =
  "When GPT sends you a long SYS message, it may split it at 3200-3600 characters and label each part as PART n/total. When you send a message out, keep each message at or under 700 characters. If your message would exceed 700 characters, split it into 600-700 character parts before sending, label each part as PART n/total, and clearly mark the last part.";

const UPDATED_RULEBOOK_LIMIT_TEXT =
  "- GPT may send a long SYS message in 3200-3600 character parts labeled as PART n/total.\n- When you send a message out, keep each message at or under 700 characters.\n- If your message would exceed 700 characters, split it into 600-700 character parts, label each part as PART n/total, and clearly mark the last part.";

export function migrateLegacyProtocolLimits(text: string) {
  return text
    .replace(LEGACY_PROTOCOL_LIMIT_PATTERN, UPDATED_PROTOCOL_LIMIT_TEXT)
    .replace(LEGACY_RULEBOOK_LIMIT_PATTERN, UPDATED_RULEBOOK_LIMIT_TEXT);
}
