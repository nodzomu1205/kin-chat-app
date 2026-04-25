import {
  SEARCH_PREFIX_RE,
  isClosingReplyText,
  isSysFormattedText,
  normalizeLine,
  normalizeText,
} from "@/lib/app/memory-interpreter/memoryInterpreterText";
import type { Message } from "@/types/chat";

const FOLLOW_UP_INVITE_RE =
  /(?:もっと詳しく知りたい|さらに知りたいこと|いつでも聞いて|気軽に質問して|教えてくださいね|ありますか|紹介できます)(?:[!！。.\s])*$/u;
const META_FACT_RE = /^(?:関連タスク|詳細|ユーザーへの回答次の方針|検索結果|Summary|Library|Detail)\s*[:：・]?/iu;

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
  if (/^(?:どれについて|わかりました|確かに|他に|いつでも|気軽に|特定の資料)/u.test(normalized)) {
    return false;
  }
  return true;
}

export function extractFacts(messages: Message[]) {
  return Array.from(
    new Set(
      messages
        .filter((message) => {
          if (isSysFormattedText(message.text || "")) return false;
          if (message.role === "gpt") return true;
          return (
            message.role === "user" &&
            (message.meta?.kind === "task_info" ||
              normalizeText(message.text || "").startsWith("Library:"))
          );
        })
        .flatMap((message) => splitIntoFactCandidates(message.text))
        .filter(isUsefulFact)
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
