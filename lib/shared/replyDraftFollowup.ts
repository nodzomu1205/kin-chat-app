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

export function findLatestReplyDraftOfferMessage(
  recentMessages?: { role?: string; text: string }[]
) {
  return [...(recentMessages || [])]
    .reverse()
    .find(
      (message) =>
        message.role !== "user" && hasReplyDraftOffer(message.text)
    );
}

export function extractReplyDraftOriginalSource(text: string) {
  const match = text.match(
    /\[原文\]\s*([\s\S]*?)(?:\n\s*\[(?:日本語訳|解説)\]|$)/u
  );
  const source = match?.[1]?.trim();
  return source || "";
}

export function resolveReplyDraftTargetLanguage(params: {
  latestRequest: string;
  originalSource: string;
}) {
  const request = params.latestRequest.normalize("NFKC").toLowerCase();
  if (/(?:ロシア語|露語|russian|\bru\b)/u.test(request)) return "Russian";
  if (/(?:英語|english|\ben\b)/u.test(request)) return "English";
  if (/(?:日本語|japanese|\bjp\b|\bja\b)/u.test(request)) return "Japanese";
  if (/(?:イタリア語|伊語|italian)/u.test(request)) return "Italian";
  if (/(?:^|[\s([/])IT(?:$|[\s)\]/])/u.test(params.latestRequest.normalize("NFKC"))) {
    return "Italian";
  }

  const source = params.originalSource.trim();
  if (/[А-Яа-яЁё]/u.test(source)) return "Russian";
  if (/[ぁ-んァ-ン一-龯]/u.test(source)) return "Japanese";
  if (looksLikeItalianSource(source)) return "Italian";
  if (/[A-Za-z]/u.test(source)) return "English";
  return "the same language as the original source message";
}

function looksLikeItalianSource(source: string) {
  const normalized = source.normalize("NFKC").toLowerCase();
  if (/[àèéìòù]/u.test(normalized)) return true;

  const markers = normalized.match(
    /\b(?:ciao|grazie|prego|buongiorno|buonasera|arrivederci|sono|siamo|sei|siete|che|perché|perche|anche|questo|questa|questi|queste|molto|bene|allora|vorrei|posso|puoi|della|dello|degli|alla|alle|nel|nella|con|non|per|una|uno|gli|le|il)\b/gu
  );

  return (markers?.length || 0) >= 2;
}
