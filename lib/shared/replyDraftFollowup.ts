export const REPLY_DRAFT_OFFER_TEXT = "返信案を作りますか？";

export function hasReplyDraftOffer(text: string) {
  return text.includes(REPLY_DRAFT_OFFER_TEXT);
}

export function isReplyDraftAffirmation(input: string) {
  const normalized = input.trim().normalize("NFKC").toLowerCase();
  if (!normalized) return false;
  if (/^(いいえ|不要|いらない|no|n\b)/u.test(normalized)) return false;
  return /^(はい|うん|お願いします|お願い|作って|出して|yes|y\b|ok\b|okay\b)/u.test(
    normalized
  );
}

export function isReplyDraftFollowupRequest(params: {
  input: string;
  recentMessages?: { role?: string; text: string }[];
}) {
  if (!isReplyDraftAffirmation(params.input)) return false;
  const latestAssistant = [...(params.recentMessages || [])]
    .reverse()
    .find((message) => message.role !== "user");
  return !!latestAssistant && hasReplyDraftOffer(latestAssistant.text);
}
