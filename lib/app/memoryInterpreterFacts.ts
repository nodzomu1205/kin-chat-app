import type { Memory } from "@/lib/memory";
import {
  SEARCH_PREFIX_RE,
  isClosingReplyText,
  normalizeLine,
  normalizeText,
  stripTopicTail,
} from "@/lib/app/memoryInterpreterText";
import type { Message } from "@/types/chat";

const FOLLOW_UP_INVITE_RE =
  /(?:もっと詳しく知りたい|他に知りたいこと|何か他に質問|気軽に声をかけて|いつでも聞いて|お話しできます|教えてくださいね|興味があれば|ありますか)[!！。\s]*$/u;
const META_FACT_RE =
  /^(?:概要|要点|特徴|ユーザーへの質問例|次の提案|不足情報|注意|参考|Summary)\s*[:：]/u;

export function extractRecentSearchQueries(messages: Message[]) {
  return Array.from(
    new Set(
      messages
        .filter((message) => message.role === "user")
        .flatMap((message) => message.text.split(/\r?\n/))
        .map((line) => normalizeText(line))
        .filter((line) => SEARCH_PREFIX_RE.test(line))
        .map((line) => line.replace(SEARCH_PREFIX_RE, "").trim())
        .filter(Boolean)
    )
  ).slice(-6);
}

function sanitizePreference(text: string) {
  const normalized = normalizeText(text);
  if (!normalized) return "";
  if (/日本語|in japanese/i.test(normalized)) return "日本語で回答してほしい";
  if (/英語|in english/i.test(normalized)) return "英語で回答してほしい";
  if (/brief|concisely|簡潔/.test(normalized)) return "簡潔に回答してほしい";
  if (/with examples?|具体例/.test(normalized)) return "具体例を含めてほしい";
  if (/bullet|箇条書/.test(normalized)) return "箇条書きで回答してほしい";
  return "";
}

export function extractPreferences(messages: Message[]) {
  return Array.from(
    new Set(
      messages
        .filter((message) => message.role === "user")
        .map((message) => sanitizePreference(message.text))
        .filter(Boolean)
    )
  ).slice(-6);
}

function sanitizeFact(line: string) {
  return normalizeLine(line)
    .replace(/\[refs?:[^\]]+\]/gi, "")
    .replace(/^Google AI Mode\s*/i, "")
    .replace(/^[:：]\s*/, "")
    .trim();
}

function isFactBlockHeading(rawLine: string) {
  const trimmed = rawLine.trim();
  if (!trimmed) return false;
  if (/^\d+[.)]\s+/.test(trimmed)) return true;
  if (/^[-*]\s+\*\*.+\*\*$/.test(trimmed)) return true;
  return false;
}

function isFactBlockContinuation(rawLine: string) {
  const trimmed = rawLine.trim();
  if (!trimmed) return false;
  if (/^[-*]\s+/.test(trimmed)) return true;
  if (/^[「『(（]/.test(trimmed)) return true;
  return !isFactBlockHeading(trimmed);
}

function toFactBlock(items: string[]) {
  const cleaned = items
    .map((line, index) => {
      const normalized = normalizeText(line)
        .replace(/^\d+[.)]\s*/, "")
        .replace(/^[-*]\s*/, "")
        .replace(/\*\*/g, "")
        .trim();
      return index === 0 ? normalized.replace(/[：:]$/, "") : normalized;
    })
    .filter(Boolean);

  if (cleaned.length === 0) return "";
  if (cleaned.length === 1) return sanitizeFact(cleaned[0]);
  return sanitizeFact(`${cleaned[0]}: ${cleaned.slice(1).join(" ")}`);
}

function splitIntoFactCandidates(text: string) {
  const lines = text.split(/\r?\n/);
  const facts: string[] = [];
  let block: string[] = [];

  const flushBlock = () => {
    if (block.length === 0) return;
    const fact = toFactBlock(block);
    if (fact) facts.push(fact);
    block = [];
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      flushBlock();
      continue;
    }

    const normalized = sanitizeFact(trimmed);
    if (!normalized) {
      flushBlock();
      continue;
    }

    if (isFactBlockHeading(trimmed)) {
      flushBlock();
      block = [trimmed];
      continue;
    }

    if (block.length > 0 && isFactBlockContinuation(trimmed)) {
      block.push(trimmed);
      continue;
    }

    flushBlock();
    facts.push(
      ...(normalized.match(/[^。！？!?]+[。！？!?]?/gu) || [normalized])
        .map((part) => sanitizeFact(part))
        .filter(Boolean)
    );
  }

  flushBlock();
  return facts;
}

function isUsefulFact(line: string) {
  const normalized = sanitizeFact(line);
  if (!normalized) return false;
  if (normalized.length < 12 || normalized.length > 320) return false;
  if (normalized.startsWith("|")) return false;
  if ((normalized.match(/\|/g) || []).length >= 2) return false;
  if (/[?？]$/.test(normalized)) return false;
  if (SEARCH_PREFIX_RE.test(normalized)) return false;
  if (isClosingReplyText(normalized)) return false;
  if (FOLLOW_UP_INVITE_RE.test(normalized)) return false;
  if (META_FACT_RE.test(normalized)) return false;
  if (
    /^(?:どういたしまして|わかりました|分かりました|また何か|何か他に|気軽に|いつでも|興味があれば|特定の作家や作品)/u.test(
      normalized
    )
  ) {
    return false;
  }
  return true;
}

export function extractFacts(messages: Message[]) {
  return Array.from(
    new Set(
      messages
        .filter((message) => message.role === "gpt")
        .flatMap((message) => splitIntoFactCandidates(message.text))
        .filter(isUsefulFact)
    )
  ).slice(-8);
}

export function extractWorksByEntityFromTable(text: string) {
  const result: Record<string, string[]> = {};
  if (!text) return result;

  text.split(/\r?\n/).forEach((rawLine) => {
    const line = normalizeText(rawLine);
    if (!line.startsWith("|")) return;

    const cells = line
      .split("|")
      .map((cell) => normalizeText(cell))
      .filter(Boolean);

    if (cells.length < 2) return;
    if (cells[0] === "作家名" || /^-+$/.test(cells[0])) return;

    const entity = normalizeText(cells[0]);
    const works = (cells[1] || "")
      .split(/[、,]/)
      .map((item) => normalizeText(item).replace(/^『|』$/g, ""))
      .filter((item) => item.length >= 2 && item.length <= 40);

    if (!entity || works.length === 0) return;
    result[entity] = Array.from(new Set([...(result[entity] || []), ...works])).slice(-8);
  });

  return result;
}

export function extractQuotedWorks(text: string) {
  return Array.from(
    new Set(
      Array.from(text.matchAll(/『([^』]{2,40})』/g), (match) => normalizeText(match[1] || ""))
        .filter(Boolean)
        .slice(-8)
    )
  );
}

function extractTrackedEntity(topic: string | undefined) {
  const normalized = stripTopicTail(normalizeText(topic || ""));
  if (!normalized) return "";

  const newsLike =
    normalized.match(/^(?:最近の)?(.+?)の(?:出来事|ニュース|状況|動向)$/u)?.[1] || "";
  if (newsLike) return normalizeText(newsLike);

  return normalized;
}

export function buildTrackedEntities(
  currentMemory: Memory,
  topic: string | undefined,
  tableWorksByEntity: Record<string, string[]>,
  topicSwitched: boolean
) {
  const primaryEntity = extractTrackedEntity(topic);
  const existing =
    !topicSwitched && Array.isArray(currentMemory.lists?.trackedEntities)
      ? (currentMemory.lists.trackedEntities as string[])
      : [];

  return Array.from(
    new Set(
      [...existing, primaryEntity || "", ...Object.keys(tableWorksByEntity)]
        .map((item) => normalizeText(item))
        .filter(Boolean)
        .filter((item) => !isClosingReplyText(item))
    )
  ).slice(-8);
}

export function pruneFactsForTopic(
  currentFacts: string[],
  nextFacts: string[],
  topicSwitched: boolean
) {
  if (topicSwitched) return nextFacts;
  return Array.from(new Set([...currentFacts, ...nextFacts])).slice(-12);
}
