import { normalizePromptTopic } from "@/lib/app/gptContextResolver";

const ACK_LEAD_IN_RE =
  /^(?:へー|なるほど|そうなんですね|そうなんだ|はい|うん|ああ|了解(?:です)?|わかりました|ありがとう(?:ございます)?)[、。\s!！?？]*/u;
const PRONOUN_TOPIC_RE =
  /^(?:それ|それら|これ|これら|あれ|あれら|彼|彼女|その人|そのこと)(?:の|は|を|が|って)?/u;
const QUESTIONISH_RE =
  /(?:誰|何|なぜ|どうして|どうやって|どういう|ですか|ますか|教えて|知っていますか|知ってますか|ありますか|でしょうか)/u;

function normalizeText(text: string) {
  return text.normalize("NFKC").replace(/\s+/g, " ").trim();
}

function stripLeadIn(text: string) {
  return normalizeText(text).replace(ACK_LEAD_IN_RE, "").trim();
}

function stripTopicTail(text: string) {
  return normalizeText(text)
    .replace(
      /(?:について(?:もっと)?|について詳しく|について教えて|について知って|を教えて|を詳しく|とは|って誰|って何|が終わった|が長い|が好き)(?:ですか|ますか|ください|下さい)?[。.!！?？\s]*$/u,
      ""
    )
    .replace(/[。.!！?？\s]+$/u, "")
    .trim();
}

function countSentenceMarkers(text: string) {
  return (text.match(/[。.!！?？]/gu) || []).length;
}

function looksLikeLongNarrativeText(text: string) {
  const normalized = normalizeText(text);
  return Boolean(
    normalized &&
      (normalized.length >= 80 || countSentenceMarkers(normalized) >= 2 || /\r?\n/.test(text))
  );
}

function looksLikeQuestionSentence(text: string) {
  return QUESTIONISH_RE.test(text);
}

function looksLikeCommentaryStatement(text: string) {
  const normalized = stripLeadIn(text);
  if (!normalized || looksLikeQuestionSentence(normalized)) return false;

  return /(?:ですね|でしたね|だと思います|だと思う|好きです|気になります|興味あります|面白いです|すごいです|印象的です|なあ|だなあ|だよね)[。.!！?？]*$/u.test(
    normalized
  );
}

function isShortAcknowledgementText(text: string) {
  const normalized = stripLeadIn(text);
  if (!normalized) return false;
  return /^(?:なるほど|了解(?:です)?|わかりました|そうなんですね|そうなんだ|ありがとう(?:ございます)?|はい|うん)[。.!！?？\s]*$/u.test(
    normalized
  );
}

function isGenericFollowUpRequest(text: string) {
  const normalized = stripLeadIn(text);
  if (!normalized) return false;
  if (/(.+?)について/.test(normalized)) return false;
  return /^(?:もっと|もう少し)?(?:詳しく)?(?:教えて|説明して|知りたい)(?:ください|下さい|ください!|下さい!|。|！|!)*$/u.test(
    normalized
  );
}

function isGenericCorrectionReply(text: string) {
  const normalized = stripLeadIn(text);
  if (!normalized) return false;
  return /^(?:それ|それら)?[、。\s]*(?:嘘|違う|デタラメ|誤り|虚偽)(?:ですね|でしょ|では|じゃない|だよね)?[。.!！?？\s]*$/u.test(
    normalized
  );
}

function isCorrectionOrDisputeText(text: string) {
  const normalized = stripLeadIn(text);
  if (!normalized) return false;
  if (isGenericCorrectionReply(normalized)) return true;
  return /(?:嘘|違う|デタラメ|誤り|虚偽|事実じゃない|本当じゃない|ごまかして別の話題)/u.test(normalized);
}

function isTruthCheckQuestion(text: string) {
  const normalized = stripLeadIn(text);
  if (!normalized) return false;
  return /^(?:それ|それって|それは)?[、。\s]*(?:本当|事実|正しい|合ってる)(?:ですか|なの|なんですか)?[。.!！?？\s]*$/u.test(
    normalized
  );
}

function isGenericContinuationQuestion(text: string) {
  const normalized = stripLeadIn(text);
  if (!normalized) return false;
  return /^(?:他には|ほかには|他に|ほかに).*(?:誰|何|ありますか|いますか|ある|いる)[。.!！?？\s]*$/u.test(
    normalized
  );
}

function shouldPreserveExistingTopic(text: string): boolean {
  const normalized = normalizeText(text);
  if (!normalized) return true;

  if (
    isShortAcknowledgementText(normalized) ||
    isGenericFollowUpRequest(normalized) ||
    isGenericContinuationQuestion(normalized) ||
    isGenericCorrectionReply(normalized) ||
    isCorrectionOrDisputeText(normalized) ||
    isTruthCheckQuestion(normalized)
  ) {
    return true;
  }

  const withoutAckLeadIn = normalized.replace(ACK_LEAD_IN_RE, "").trim();
  if (
    ACK_LEAD_IN_RE.test(normalized) &&
    withoutAckLeadIn &&
    !looksLikeQuestionSentence(withoutAckLeadIn) &&
    /(?:ですね|でしたね|だと思います|気になります|興味あります|好きです)[。.!！?？]*$/u.test(
      withoutAckLeadIn
    )
  ) {
    return true;
  }

  const clauses = normalized
    .split(/[。.!！?？]/u)
    .map((item) => item.trim())
    .filter(Boolean);
  if (clauses.length <= 1) return false;

  return clauses.some((clause) => shouldPreserveExistingTopic(clause));
}

function normalizeExtractedSubject(value: string) {
  const stripped = stripTopicTail(
    value.replace(/^(?:ユーザーは|ユーザーが)/u, "").replace(/[「」"'`]/g, "").trim()
  );

  const eraMatch = stripped.match(/([\u4e00-\u9faf\u3005]+時代)$/u);
  if (eraMatch?.[1]) return eraMatch[1];

  return stripped;
}

export function isWeakTopicCandidate(text: string) {
  const normalized = normalizeText(text);
  if (!normalized) return true;

  const withoutAckLeadIn = normalized.replace(ACK_LEAD_IN_RE, "").trim();
  return (
    !withoutAckLeadIn ||
    ACK_LEAD_IN_RE.test(normalized) ||
    PRONOUN_TOPIC_RE.test(withoutAckLeadIn)
  );
}

export function extractQuestionSubject(text: string) {
  const normalized = stripLeadIn(text);
  if (!normalized) return "";

  const patterns = [
    /^(.+?)について(?:もっと)?(?:詳しく)?(?:教えて|知って(?:いますか|ますか)?|知っていますか|知ってますか|説明して)(?:ください|下さい|ください!|下さい!|ですか|ますか)?[。.!！?？\s]*$/u,
    /^(.+?)を(?:もっと)?(?:詳しく)?(?:教えて|知って(?:いますか|ますか)?|知っていますか|知ってますか|説明して)(?:ください|下さい|ですか|ますか)?[。.!！?？\s]*$/u,
    /^(.+?)って(?:誰|何)(?:ですか|でしょうか)?[。.!！?？\s]*$/u,
    /^(.+?)とは(?:何|誰)?(?:ですか|でしょうか)?[。.!！?？\s]*$/u,
    /^なぜ(.+?)が(?:終わった|終わってしまった|続いた|長い|圧倒的に長い)(?:のですか|んですか|の|のですか)?[。.!！?？\s]*$/u,
    /^(.+?)が(?:終わった|終わってしまった|続いた|長い|圧倒的に長い)(?:のですか|んですか)?[。.!！?？\s]*$/u,
    /^(.+?)の中で一番有名なのは誰(?:ですか|でしょうか)?[。.!！?？\s]*$/u,
    /^(.+?)(?:で)?一番有名なのは誰(?:か知っていますか|ですか|でしょうか)?[。.!！?？\s]*$/u,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match?.[1]) continue;
    const candidate = normalizeExtractedSubject(match[1]);
    if (candidate) return candidate;
  }

  const eraMatch = normalized.match(/([\u4e00-\u9faf\u3005]+時代)が(?:終わった|終わってしまった|続いた|長い|圧倒的に長い)/u);
  if (eraMatch?.[1]) {
    return eraMatch[1];
  }

  return "";
}

export function normalizeTopicCandidate(text: string) {
  const normalized = stripLeadIn(text);
  if (!normalized) return "";
  if (shouldPreserveExistingTopic(normalized)) return "";

  const questionSubject = extractQuestionSubject(normalized);
  if (questionSubject) {
    if (isWeakTopicCandidate(questionSubject)) return "";
    return questionSubject;
  }

  if (looksLikeCommentaryStatement(normalized)) return "";

  const promptTopic = stripTopicTail(normalizePromptTopic(normalized) || "");
  if (promptTopic) {
    if (
      isWeakTopicCandidate(promptTopic) ||
      promptTopic.length > 48 ||
      countSentenceMarkers(promptTopic) >= 2 ||
      looksLikeQuestionSentence(promptTopic) ||
      (looksLikeLongNarrativeText(normalized) && promptTopic.length > 24)
    ) {
      return "";
    }
    return promptTopic;
  }

  if (looksLikeLongNarrativeText(normalized)) return "";

  const fallback = stripTopicTail(normalized.replace(/[。.!！?？\s]+$/u, "").trim());
  if (!fallback || isWeakTopicCandidate(fallback) || looksLikeQuestionSentence(fallback)) {
    return "";
  }

  return fallback;
}
