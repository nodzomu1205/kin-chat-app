import {
  extractQuestionSubject as extractQuestionSubjectFromTopicExtractor,
  isWeakTopicCandidate as isWeakTopicCandidateFromTopicExtractor,
  normalizeTopicCandidate as normalizeTopicCandidateFromTopicExtractor,
} from "@/lib/app/memoryInterpreterTopicExtractor";

export const SEARCH_PREFIX_RE = /^(?:検索|search)\s*[:：]/i;

const ACK_LEAD_IN_RE = /^(?:へー|なるほど|そうなんだ|そうなんですね)[、,\s]*/u;
const SENTENCE_MARK_RE = /[。！？!?]/gu;
const QUESTIONISH_RE =
  /(?:誰|何|どこ|いつ|なぜ|何故|どうして|ですか|でしょうか|ますか|教えて|知りたい|説明して)/u;

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
    .replace(/^(?:はい|では|要するに|ちなみにでは)[、,\s]*/u, "")
    .trim();
}

export function stripTopicTail(text: string) {
  return normalizeText(text)
    .replace(
      /(?:について(?:もっと)?(?:教えて|知りたい|説明して)(?:ください|下さい)?|について知っていますか|について|のことを教えて(?:ください|下さい)?|を教えて(?:ください|下さい)?|の弟子で一番有名なのは誰(?:か)?知っていますか|ですか\??|は\??)\s*$/u,
      ""
    )
    .replace(/[!！?？。]+$/u, "")
    .trim();
}

export function countSentenceMarkers(text: string) {
  return (text.match(SENTENCE_MARK_RE) || []).length;
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
    /(?:ありがとう|もう大丈夫です|大丈夫です|一旦いい|そこは一旦|もう十分|この話題は一旦いい|別件で|終わりで)(?:[!！.\s]|$)/u.test(
      normalized
    )
  ) {
    return true;
  }

  if (/^(?:ok|okay|thanks|thank you|got it|i see)[!?.\s]*$/iu.test(normalized)) {
    return true;
  }

  return false;
}

export function isSearchDirectiveText(text: string) {
  return SEARCH_PREFIX_RE.test(normalizeText(text));
}

export function isShortAcknowledgementText(text: string) {
  const normalized = stripLeadIn(text);
  if (!normalized) return false;

  return (
    /^(?:なるほど|了解(?:です)?|わかりました|へー|そうなんですね|そうなんだ|確かに|たしかに|面白いですね)(?:[!！.\s]|$)/u.test(
      normalized
    ) || /^(?:i see|got it|understood|okay|ok|right|makes sense)[.!?]*$/iu.test(normalized)
  );
}

export function isGenericFollowUpRequest(text: string) {
  const normalized = stripLeadIn(text).replace(/^[、,\s]+/u, "");
  if (!normalized) return false;
  if (/(?:.+について|.+を|.+のことを)(?:もっと)?(?:詳しく)?(?:教えて|知りたい|説明して)/u.test(normalized)) {
    return false;
  }

  return /^(?:はい[、,\s]*)?(?:もっと|もう少し)?(?:詳しく|くわしく)?(?:教えて|説明して|知りたい)(?:ください|下さい)?(?:[!！.\s]|$)/u.test(
    normalized
  );
}

export function isGenericCorrectionReply(text: string) {
  const normalized = stripLeadIn(text);
  if (!normalized) return false;

  return /^(?:(?:それ|それら|全部)[、,\s]*)?(?:嘘|間違い|違う|誤り)(?:だ|でしょ|でしょう|ですよ|です)(?:[?？!！.\s]|$)/u.test(
    normalized
  );
}

export function isCorrectionOrDisputeText(text: string) {
  const normalized = stripLeadIn(text);
  if (!normalized) return false;
  if (isGenericCorrectionReply(normalized)) return true;

  return (
    /(?:それ|それら|全部).*(?:嘘|虚偽|間違い|違う|誤り|ごまかし|話題そらし)/u.test(normalized) ||
    /ごまかして別の話題|別の話題にしよう/u.test(normalized)
  );
}

export function isTruthCheckQuestion(text: string) {
  const normalized = stripLeadIn(text);
  if (!normalized) return false;

  return /^(?:(?:それ|それって|それは|これ|これは)[、,\s]*)?(?:本当|事実|正しい)(?:ですか|なの|なんですか)?(?:[?？!！.\s]|$)/u.test(
    normalized
  );
}

export function isGenericContinuationQuestion(text: string) {
  const normalized = stripLeadIn(text);
  if (!normalized) return false;

  return /^(?:他には|ほかには|他に|ほかに).*(?:誰|なに|どんな人|どんなもの).*(?:いますか|ありますか|ある|いる)(?:[?？!！.\s]|$)/u.test(
    normalized
  );
}

function looksLikeQuestionSentence(text: string) {
  return QUESTIONISH_RE.test(text);
}

function isAcknowledgementLedComment(text: string) {
  const normalized = normalizeText(text);
  if (!normalized) return false;

  const withoutAckLeadIn = normalized.replace(ACK_LEAD_IN_RE, "").trim();
  if (!withoutAckLeadIn) return false;

  return (
    ACK_LEAD_IN_RE.test(normalized) &&
    !looksLikeQuestionSentence(withoutAckLeadIn) &&
    /(?:ですね|でした|ました|なんですね|のですね|と思います|気がします)/u.test(withoutAckLeadIn)
  );
}

function shouldPreserveExistingTopicSingle(text: string) {
  const normalized = normalizeText(text);
  if (!normalized) return true;

  return (
    isClosingReplyText(normalized) ||
    isShortAcknowledgementText(normalized) ||
    isAcknowledgementLedComment(normalized) ||
    isGenericFollowUpRequest(normalized) ||
    isGenericContinuationQuestion(normalized) ||
    isGenericCorrectionReply(normalized) ||
    isCorrectionOrDisputeText(normalized) ||
    isTruthCheckQuestion(normalized)
  );
}

export function shouldPreserveExistingTopic(text: string) {
  const normalized = normalizeText(text);
  if (!normalized) return true;

  if (shouldPreserveExistingTopicSingle(normalized)) return true;

  const clauses = normalized
    .split(/[。！？!?]/u)
    .map((item) => item.trim())
    .filter(Boolean);

  if (clauses.length <= 1) return false;
  return clauses.some((clause) => shouldPreserveExistingTopicSingle(clause));
}

export function isWeakTopicCandidate(text: string) {
  return isWeakTopicCandidateFromTopicExtractor(text);
}

export function extractQuestionSubject(text: string) {
  return extractQuestionSubjectFromTopicExtractor(text);
}

export function normalizeTopicCandidate(text: string) {
  return normalizeTopicCandidateFromTopicExtractor(text);
}
