import {
  SEARCH_PREFIX_RE,
  isClosingReplyText,
  isSysFormattedText,
  normalizeLine,
  normalizeText,
} from "@/lib/app/memory-interpreter/memoryInterpreterText";
import type { Message } from "@/types/chat";

const DEFAULT_FACT_LIMIT = 12;
const MAX_FACT_LENGTH = 320;
const MAX_FACTS_PER_MESSAGE = 8;

const FOLLOW_UP_INVITE_RE =
  /(?:もっと詳しく知りたい|さらに知りたいこと|いつでも聞いて|気軽に質問して|教えてくださいね|ありますか|紹介できます)(?:[!！。.\s])*$/u;
const META_FACT_RE = /^(?:関連タスク|詳細|ユーザーへの回答次の方針|検索結果|Summary|Library|Detail)\s*[:：・]?/iu;
const OPERATIONAL_STATUS_RE =
  /^(?:\[Folder\]\s+.+\|\s*\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}|(?:Google Drive)?ファイルをライブラリに保存しました[:：]|Google Driveファイルをライブラリに保存しました[:：]|抽出文字数[:：]\s*[\d,]+\s*chars?$)/u;
const COMMON_HEADING_ONLY_RE =
  /^(?:How to run locally|Getting started|Setup|Installation|Usage|Prerequisites|Notes?|概要|手順|使い方|準備|補足)$/iu;

const INTERNAL_MEMORY_LABEL_RE = /^\[(?:Conversation compaction|Memory compaction)\]$/i;

function sanitizeFact(line: string) {
  return normalizeLine(line)
    .replace(/\[refs?:[^\]]+\]/gi, "")
    .replace(/^Google AI Mode\s*/i, "")
    .replace(/^[:：・\s]+/, "")
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
  if (/^[•・]/.test(trimmed)) return true;
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
      return index === 0 ? normalized.replace(/[。.]$/, "") : normalized;
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

function isUsefulFact(line: string, options?: { maxLength?: number }) {
  const normalized = sanitizeFact(line);
  const maxLength = options?.maxLength ?? MAX_FACT_LENGTH;
  if (!normalized) return false;
  if (normalized.length < 12 || normalized.length > maxLength) return false;
  if (normalized.startsWith("|")) return false;
  if ((normalized.match(/\|/g) || []).length >= 2) return false;
  if (/[?？]$/.test(normalized)) return false;
  if (SEARCH_PREFIX_RE.test(normalized)) return false;
  if (isClosingReplyText(normalized)) return false;
  if (FOLLOW_UP_INVITE_RE.test(normalized)) return false;
  if (META_FACT_RE.test(normalized)) return false;
  if (OPERATIONAL_STATUS_RE.test(normalized)) return false;
  if (COMMON_HEADING_ONLY_RE.test(normalized)) return false;
  if (INTERNAL_MEMORY_LABEL_RE.test(normalized)) return false;
  if (/^(?:どれについて|わかりました|確かに|他に|いつでも|気軽に|特定の資料)/u.test(normalized)) {
    return false;
  }
  return true;
}

function isMarkdownHeadingLine(line: string) {
  return /^#{1,6}\s+\S/.test(line.trim());
}

function isNonFactTextFragment(text: string) {
  const normalized = sanitizeFact(text);
  if (!normalized) return true;
  if (COMMON_HEADING_ONLY_RE.test(normalized)) return true;
  if (INTERNAL_MEMORY_LABEL_RE.test(normalized)) return true;
  if (isMarkdownHeadingLine(normalized)) return true;
  if (/^(?:#{1,6}\s*)?\d+[.)]?$/.test(normalized)) return true;
  if (/^[A-Za-z]{1,4}を/.test(normalized)) return true;
  if (/[、,]\s*[A-Za-z0-9.+#-]{1,24}\.$/.test(normalized)) return true;
  return false;
}

function shortenLibrarySubject(subject: string) {
  const withoutSource = subject
    .replace(/\s*\[(?:ingested_file|kin_created|search)\]\s+.*$/i, "")
    .replace(/\s*\[\d+\s*chars\](?:\.[A-Za-z0-9]+)?$/i, "")
    .trim();
  if (withoutSource) return withoutSource;

  const lastPathPart = subject.split(/[\\/]/).filter(Boolean).at(-1) || subject;
  return lastPathPart
    .replace(/\s*\[\d+\s*chars\](?:\.[A-Za-z0-9]+)?$/i, "")
    .replace(/\.[A-Za-z0-9]+$/i, "")
    .trim();
}

function isOperationalStatusMessage(text: string) {
  const meaningfulLines = text
    .split(/\r?\n/)
    .map((line) => sanitizeFact(line))
    .filter(Boolean);
  return (
    meaningfulLines.length > 0 &&
    meaningfulLines.every((line) => OPERATIONAL_STATUS_RE.test(line))
  );
}

function extractLibraryAggregateFactCandidates(text: string) {
  const normalizedText = text.replace(/\r\n/g, "\n").trim();
  if (!normalizedText.startsWith("Library Data")) return [];

  const facts: string[] = [];
  let currentTitle = "";
  let currentSections: string[] = [];
  let currentSection = "";

  const flushCurrent = () => {
    if (!currentTitle) return;
    const body = currentSections.join(" ").replace(/\s+/g, " ").trim();
    facts.push([currentTitle, body].filter(Boolean).join(": "));
    currentTitle = "";
    currentSections = [];
    currentSection = "";
  };

  for (const rawLine of normalizedText.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^(?:Library Data|Mode:|Items:)/i.test(line)) continue;

    if (/^\d+[.)]\s+/.test(line)) {
      flushCurrent();
      currentTitle = sanitizeFact(line.replace(/^\d+[.)]\s+/, ""));
      continue;
    }

    if (/^(?:Summary|Detail):/i.test(line)) {
      currentSection = line.replace(/^(Summary|Detail):\s*/i, "$1: ").trim();
      if (currentSection) currentSections.push(currentSection);
      continue;
    }

    if (isMarkdownHeadingLine(line)) continue;

    if (currentSection && currentSections.length > 0) {
      currentSections[currentSections.length - 1] = `${currentSections[currentSections.length - 1]} ${line}`.trim();
    }
  }

  flushCurrent();
  return facts;
}

function extractStructuredFactCandidates(text: string) {
  const normalizedText = text.replace(/\r\n/g, "\n").trim();
  const facts: string[] = [];
  let currentTitle = "";
  let currentSections: string[] = [];
  let currentSection = -1;

  const flushCurrent = () => {
    if (!currentTitle) return;
    const body = currentSections.join(" ").replace(/\s+/g, " ").trim();
    facts.push([currentTitle, body].filter(Boolean).join(": "));
    currentTitle = "";
    currentSections = [];
    currentSection = -1;
  };

  for (const rawLine of normalizedText.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^(?:Library Data|Mode:|Items:)/i.test(line)) continue;

    if (/^\d+[.)]\s+/.test(line)) {
      flushCurrent();
      currentTitle = sanitizeFact(line.replace(/^\d+[.)]\s+/, ""));
      continue;
    }

    if (!currentTitle) continue;

    if (/^(?:Summary|Detail):/i.test(line)) {
      const section = line.replace(/^(Summary|Detail):\s*/i, "$1: ").trim();
      if (section) {
        currentSections.push(section);
        currentSection = currentSections.length - 1;
      }
      continue;
    }

    if (isMarkdownHeadingLine(line)) continue;

    if (currentSection >= 0) {
      currentSections[currentSection] = `${currentSections[currentSection]} ${line}`.trim();
    }
  }

  flushCurrent();
  return facts;
}

function splitSentences(text: string) {
  const sentenceRe = /[^。.!?！？\n]+[。.!?！？]?/gu;
  return (text.match(sentenceRe) || [text])
    .map((part) => sanitizeFact(part))
    .filter(Boolean);
}

function withCandidateSubject(subject: string, body: string) {
  const normalizedSubject = shortenLibrarySubject(
    sanitizeFact(subject).replace(/[:：]+$/, "")
  );
  const normalizedBody = sanitizeFact(body);
  if (!normalizedBody) return "";
  return [normalizedSubject, normalizedBody].filter(Boolean).join(": ");
}

function formatFactForMemory(fact: string) {
  return sanitizeFact(fact)
    .replace(/\s*\[(?:ingested_file|kin_created|search)\]\s+[^:]+(?=:)/i, "")
    .replace(/\s*\[\d+\s*chars\](?:\.[A-Za-z0-9]+)?(?=:)/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function expandSectionedFactCandidate(candidate: string) {
  const normalized = sanitizeFact(candidate);
  if (!normalized) return [];

  const summaryMatch = normalized.match(/\bSummary:\s*([\s\S]*?)(?=\s+\bDetail:|$)/i);
  const detailMatch = normalized.match(/\bDetail:\s*([\s\S]*)$/i);

  if (!summaryMatch && !detailMatch) {
    if (normalized.length <= MAX_FACT_LENGTH) return [normalized];
    return splitSentences(normalized).slice(0, 3);
  }

  const sectionStart = Math.min(
    summaryMatch?.index ?? Number.POSITIVE_INFINITY,
    detailMatch?.index ?? Number.POSITIVE_INFINITY
  );
  const subject = sanitizeFact(normalized.slice(0, sectionStart).trim());
  const expanded: string[] = [];

  const summary = sanitizeFact(summaryMatch?.[1] || "");
  if (summary) {
    const summaryFact = withCandidateSubject(subject, summary);
    if (summaryFact.length <= MAX_FACT_LENGTH) {
      expanded.push(summaryFact);
    } else {
      expanded.push(
        ...splitSentences(summary)
          .filter((part) => !isNonFactTextFragment(part))
          .slice(0, 2)
          .map((part) => withCandidateSubject(subject, part))
      );
    }
  }

  const detail = sanitizeFact(detailMatch?.[1] || "");
  if (detail) {
    expanded.push(
      ...splitSentences(detail)
        .filter((part) => !isNonFactTextFragment(part))
        .slice(0, 2)
        .map((part) => withCandidateSubject(subject, part))
    );
  }

  return expanded.filter(Boolean);
}

function roundRobin<T>(groups: T[][], limit: number) {
  const result: T[] = [];
  let cursor = 0;
  while (result.length < limit) {
    let added = false;
    for (const group of groups) {
      const value = group[cursor];
      if (typeof value === "undefined") continue;
      result.push(value);
      added = true;
      if (result.length >= limit) break;
    }
    if (!added) break;
    cursor += 1;
  }
  return result;
}

function moveUniqueFactsToTail(baseFacts: string[], priorityFacts: string[]) {
  const result = [...baseFacts];
  for (const fact of priorityFacts) {
    const existingIndex = result.indexOf(fact);
    if (existingIndex >= 0) result.splice(existingIndex, 1);
    result.push(fact);
  }
  return result;
}

function shouldReadFactMessage(message: Message) {
  const text = message.text || "";
  if (isSysFormattedText(text)) return false;
  if (isOperationalStatusMessage(text)) return false;
  if (message.role === "gpt") return true;
  return (
    message.role === "user" &&
    (message.meta?.kind === "task_info" ||
      normalizeText(text).startsWith("Library:"))
  );
}

function extractFactGroupsFromMessage(message: Message) {
  const structuredFacts = extractStructuredFactCandidates(message.text || "");
  const libraryFacts =
    structuredFacts.length > 0
      ? []
      : extractLibraryAggregateFactCandidates(message.text || "");
  const candidates =
    structuredFacts.length > 0
      ? structuredFacts
      : libraryFacts.length > 0
      ? libraryFacts
      : splitIntoFactCandidates(message.text || "");

  return candidates
    .map((candidate) =>
      expandSectionedFactCandidate(candidate)
        .map(formatFactForMemory)
        .filter((fact) => !isNonFactTextFragment(fact))
        .filter((fact) => isUsefulFact(fact))
    )
    .filter((group) => group.length > 0);
}

export function extractFacts(messages: Message[]) {
  const factGroups = messages
    .filter(shouldReadFactMessage)
    .flatMap((message) =>
      extractFactGroupsFromMessage(message).map((group) =>
        group.slice(0, MAX_FACTS_PER_MESSAGE)
      )
    )
    .filter((group) => group.length > 0);

  const broadFacts = roundRobin(factGroups, DEFAULT_FACT_LIMIT);
  const richFacts = roundRobin(
    factGroups.filter((group) => group.length > 1),
    DEFAULT_FACT_LIMIT
  );
  return Array.from(
    new Set(moveUniqueFactsToTail(broadFacts, richFacts))
  ).slice(-DEFAULT_FACT_LIMIT);
}

export function pruneFactsForTopic(
  currentFacts: string[],
  nextFacts: string[],
  topicSwitched: boolean
) {
  if (topicSwitched) return nextFacts;
  return Array.from(new Set([...currentFacts, ...nextFacts])).slice(-12);
}
