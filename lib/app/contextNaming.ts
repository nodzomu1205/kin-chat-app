import type { TaskDraft } from "@/types/task";

export type SuggestLabelInput = {
  explicitTitle?: string;
  searchQuery?: string;
  freeText?: string;
  fallback?: string;
};

const DEFAULT_TASK_TITLE = "タスク";
const DEFAULT_TOPIC_LABEL = "話題";
const MAX_LABEL_LENGTH = 40;

const STOP_LABELS = new Set([
  "",
  "task",
  "prepared task",
  "deepened task",
  "reply",
  "response",
  "update",
  "note",
  "message",
  "comment",
  "chat",
  "タスク",
  "話題",
  "概要",
  "要点",
  "本文",
  "メモ",
  "その点",
  "これ",
  "それ",
  "こちら",
  "あちら",
]);

const GENERIC_LEADS = [
  /^その/u,
  /^これ/u,
  /^それ/u,
  /^こちら/u,
  /^あちら/u,
];

function normalizeSpace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function stripListPrefix(text: string) {
  return text.replace(/^[\-\*\u2022\u30fb\d]+[.)\]:：\s]*/u, "").trim();
}

function stripConversationLead(text: string) {
  return text.replace(
    /^(はい|ええ|なるほど|了解です|了解しました|承知しました|ありがとうございます|ありがとう|では|それでは|ちなみに|なお)、?\s*/u,
    ""
  );
}

function stripTaskBoilerplate(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/^\s*\[?\s*タスク整理結果\s*\]?\s*$/gimu, "")
    .replace(/^\s*【\s*タスク整理結果\s*】\s*$/gimu, "")
    .replace(/^\s*Task updated from latest GPT message\.?\s*$/gimu, "")
    .replace(
      /^\s*Library item (?:attached to task|imported into a new task)\.?\s*$/gimu,
      ""
    )
    .trim();
}

function extractSummaryLine(text: string) {
  const normalized = stripTaskBoilerplate(text);
  const match = normalized.match(/^概要[:：]\s*(.+)$/mu);
  return match?.[1]?.trim() ?? "";
}

function trimLabelPunctuation(text: string) {
  return text
    .replace(/^[「『【\[(]+/u, "")
    .replace(/[」』】\])、。!！?？:：;,.\s]+$/u, "")
    .trim();
}

function normalizeLabel(text: string, maxLength = MAX_LABEL_LENGTH) {
  const cleaned = trimLabelPunctuation(
    normalizeSpace(stripConversationLead(stripListPrefix(text)))
  );
  if (!cleaned) return "";
  return cleaned.slice(0, maxLength).trim();
}

export function looksGenericLabel(text: string): boolean {
  const normalized = normalizeLabel(text, 24);
  if (!normalized) return true;

  const lowered = normalized.toLowerCase();
  if (STOP_LABELS.has(lowered) || STOP_LABELS.has(normalized)) return true;
  return GENERIC_LEADS.some((pattern) => pattern.test(normalized));
}

function extractQuotedTerms(text: string) {
  const matches = [
    ...text.matchAll(/[「『]([^「」『』]{1,20})[」』]/gu),
  ]
    .map((match) => normalizeLabel(match[1], 20))
    .filter((item) => item && !looksGenericLabel(item));

  return Array.from(new Set(matches));
}

function firstMeaningfulLine(text: string) {
  const lines = stripTaskBoilerplate(text)
    .split("\n")
    .map((line) => normalizeSpace(stripConversationLead(stripListPrefix(line))))
    .filter(Boolean)
    .filter((line) => !/^(概要|要点|補足|背景)[:：]?$/u.test(line));

  return lines[0] ?? "";
}

function firstMeaningfulSentence(text: string) {
  const line = firstMeaningfulLine(text);
  if (!line) return "";

  const sentence =
    line
      .split(/[。.!！?？]/u)
      .map((part) => normalizeSpace(part))
      .find(Boolean) ?? line;

  return sentence;
}

function pickStructuredCandidate(text: string) {
  const candidate = normalizeSpace(text).replace(/^概要[:：]\s*/u, "");
  if (!candidate) return "";

  const embeddedWholePhrasePatterns = [
    /(.+?の(?:関係|比較|違い|概要|整理|検証|確認|背景|時代背景|作品|思想|影響|要点|魅力|特徴|候補|一覧))(?:について|に関する|には|に|は|が|を|、|。|$)/u,
  ];

  for (const pattern of embeddedWholePhrasePatterns) {
    const match = candidate.match(pattern);
    if (!match) continue;
    const whole = normalizeLabel(match[1], 32);
    if (whole && !looksGenericLabel(whole)) return whole;
  }

  const nounPhraseMatches = [
    ...candidate.matchAll(
      /([^\s、。]{1,40}の(?:関係|比較|違い|概要|整理|検証|確認|背景|時代背景|作品|思想|影響|要点|魅力|特徴|候補|一覧))/gu
    ),
  ];
  for (const match of nounPhraseMatches.reverse()) {
    const whole = normalizeLabel(match[1], 32);
    if (whole && !looksGenericLabel(whole)) return whole;
  }

  const quotedTerms = extractQuotedTerms(candidate);
  if (quotedTerms.length > 0) {
    return normalizeLabel(quotedTerms.slice(0, 3).join("・"), 32);
  }

  const subjectPatterns = [
    /^(.+?)について/u,
    /^(.+?)に関する/u,
    /^(.+?)を(?:整理|比較|確認|検証|調査|分析|考察|説明|要約)/u,
    /^(.+?)は(?:.+)$/u,
    /^(.+?)が(?:.+)$/u,
  ];

  for (const pattern of subjectPatterns) {
    const match = candidate.match(pattern);
    if (!match) continue;
    const subject = normalizeLabel(match[1], 32);
    if (subject && !looksGenericLabel(subject)) return subject;
  }

  const plain = normalizeLabel(candidate, 32);
  if (plain && !looksGenericLabel(plain)) return plain;

  return "";
}

function extractStructuredTitle(text: string) {
  const cleaned = stripTaskBoilerplate(text);
  if (!cleaned) return "";

  const summary = extractSummaryLine(cleaned);
  const summaryCandidate = pickStructuredCandidate(summary);
  if (summaryCandidate) return summaryCandidate;

  const sentenceCandidate = pickStructuredCandidate(firstMeaningfulSentence(cleaned));
  if (sentenceCandidate) return sentenceCandidate;

  const quotedTerms = extractQuotedTerms(cleaned);
  if (quotedTerms.length > 0) {
    return normalizeLabel(quotedTerms.slice(0, 3).join("・"), 32);
  }

  return "";
}

export function suggestTopicLabel(input: SuggestLabelInput): string {
  const explicit = normalizeLabel(input.explicitTitle ?? "");
  if (explicit && !looksGenericLabel(explicit)) return explicit;

  const search = normalizeLabel(input.searchQuery ?? "");
  if (search && !looksGenericLabel(search)) return search;

  const fromFreeText = extractStructuredTitle(input.freeText ?? "");
  if (fromFreeText && !looksGenericLabel(fromFreeText)) return fromFreeText;

  return normalizeLabel(input.fallback ?? DEFAULT_TOPIC_LABEL);
}

export function suggestTaskTitle(input: SuggestLabelInput): string {
  const explicit = normalizeLabel(input.explicitTitle ?? "");
  if (explicit) return explicit;

  const search = normalizeLabel(input.searchQuery ?? "");
  if (search && !looksGenericLabel(search)) return search;

  const fromBody = extractStructuredTitle(input.freeText ?? "");
  if (fromBody && !looksGenericLabel(fromBody)) return fromBody;

  return normalizeLabel(input.fallback ?? DEFAULT_TASK_TITLE);
}

export function shouldUpdateTopic(prevTopic?: string, nextTopic?: string): boolean {
  const prev = normalizeLabel(prevTopic ?? "");
  const next = normalizeLabel(nextTopic ?? "");

  if (!next) return false;
  if (!prev) return true;
  if (prev === next) return false;
  if (looksGenericLabel(next)) return false;
  return true;
}

export function resolveDraftTitle(draft: TaskDraft, input: SuggestLabelInput): string {
  const suggested = suggestTaskTitle({
    ...input,
    fallback: draft.title || draft.taskName || input.fallback || DEFAULT_TASK_TITLE,
  });

  return suggested || draft.title || draft.taskName || DEFAULT_TASK_TITLE;
}
