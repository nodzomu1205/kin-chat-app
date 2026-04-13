import { normalizePromptTopic } from "@/lib/app/gptContextResolver";

export const SEARCH_PREFIX_RE = /^(?:検索|search)\s*[:：]/i;

export function normalizeText(text: string) {
  return text.normalize("NFKC").replace(/\s+/g, " ").trim();
}

export function normalizeLine(text: string) {
  return normalizeText(text)
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .replace(/^[-*•]\s*/, "")
    .replace(/\*\*/g, "")
    .trim();
}

export function stripLeadIn(text: string) {
  return normalizeText(text)
    .replace(/^(?:次は|では|今度は|じゃあ|では次に)\s*/u, "")
    .trim();
}

export function stripTopicTail(text: string) {
  return normalizeText(text)
    .replace(/(?:について(?:教えて|知りたい|詳しく|説明して)(?:ください|下さい)?|について知っていますか|について|を知っていますか|のことを知っていますか|で|は)\??$/u, "")
    .replace(/[!！。?？]+$/u, "")
    .trim();
}

export function countSentenceMarkers(text: string) {
  return (text.match(/[。！？!?]/gu) || []).length;
}

export function looksLikeLongNarrativeText(text: string) {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  if (normalized.length >= 80) return true;
  if (countSentenceMarkers(normalized) >= 2) return true;
  if (/\r?\n/.test(text)) return true;
  return false;
}

export function isClosingReplyText(text: string) {
  const normalized = normalizeText(text);
  if (!normalized) return true;

  if (
    /(?:ありがとう|有難う|大丈夫です|一旦大丈夫|一旦いい|そこは一旦|もう大丈夫|この話題は一旦いい|結構です|いえ、いいです|へー、そうなんですね|そうなんですね|了解です|わかりました)(?:[!！。\s]|$)/u.test(
      normalized
    )
  ) {
    return true;
  }

  if (/^(?:ok|okay|thanks|thank you|got it|i see)[!！.\s]*$/iu.test(normalized)) {
    return true;
  }

  return false;
}

export function isSearchDirectiveText(text: string) {
  return SEARCH_PREFIX_RE.test(normalizeText(text));
}

export function extractQuestionSubject(text: string) {
  const normalized = stripLeadIn(text);
  if (!normalized) return "";

  const patterns = [
    /^(.+?)について(?:教えて|知りたい|説明して)(?:ください|下さい)?/u,
    /^(.+?)について知っていますか/u,
    /^(.+?)を知っていますか/u,
    /^(.+?)のことを知っていますか/u,
    /^(.+?)は\??$/u,
    /^(.+?)で\??$/u,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    const candidate = stripTopicTail(match?.[1] || "");
    if (candidate) return candidate;
  }

  return "";
}

export function normalizeTopicCandidate(text: string) {
  const normalized = stripLeadIn(text);
  if (!normalized) return "";
  if (isClosingReplyText(normalized)) return "";

  const questionSubject = extractQuestionSubject(normalized);
  if (questionSubject) {
    return stripTopicTail(questionSubject);
  }

  const promptTopic = stripTopicTail(normalizePromptTopic(normalized) || "");
  if (promptTopic) {
    if (
      promptTopic.length > 48 ||
      countSentenceMarkers(promptTopic) >= 2 ||
      (looksLikeLongNarrativeText(normalized) && promptTopic.length > 24)
    ) {
      return "";
    }
    return promptTopic;
  }

  if (looksLikeLongNarrativeText(normalized)) {
    return "";
  }

  return stripTopicTail(normalized.replace(/[!！。?？]+$/u, "").trim());
}
