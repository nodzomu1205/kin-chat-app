import type { Memory } from "@/lib/memory";
import {
  SEARCH_PREFIX_RE,
  isClosingReplyText,
  isSysFormattedText,
  normalizeText,
  stripTopicTail,
} from "@/lib/app/memory-interpreter/memoryInterpreterText";
import type { Message } from "@/types/chat";

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

export function extractRecentSearchQueries(messages: Message[]) {
  return Array.from(
    new Set(
      messages
        .filter(
          (message) => message.role === "user" && !isSysFormattedText(message.text || "")
        )
        .flatMap((message) => message.text.split(/\r?\n/))
        .map((line) => normalizeText(line))
        .filter((line) => SEARCH_PREFIX_RE.test(line))
        .map((line) => line.replace(SEARCH_PREFIX_RE, "").trim())
        .filter(Boolean)
    )
  ).slice(-6);
}

export function extractPreferences(messages: Message[]) {
  return Array.from(
    new Set(
      messages
        .filter(
          (message) => message.role === "user" && !isSysFormattedText(message.text || "")
        )
        .map((message) => sanitizePreference(message.text))
        .filter(Boolean)
    )
  ).slice(-6);
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
