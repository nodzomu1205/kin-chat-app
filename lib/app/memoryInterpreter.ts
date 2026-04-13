import type { Memory } from "@/lib/memory";
import { normalizePromptTopic } from "@/lib/app/gptContextResolver";
import type {
  ApprovedMemoryRule,
  MemoryInterpreterSettings,
  PendingMemoryRuleCandidate,
} from "@/lib/memoryInterpreterRules";
import type { Message } from "@/types/chat";

export type MemoryInterpreterOptions = {
  topicSeed?: string;
  lastUserIntent?: string;
  activeDocument?: Record<string, unknown> | null;
  closingReplyOverride?: boolean;
  trackedEntityOverride?: string;
};

type ProvisionalContextInput = {
  currentMemory: Memory;
  inputText: string;
  currentTaskTitle?: string;
  activeDocumentTitle?: string;
  lastSearchQuery?: string;
};

type MemoryPatchInput = {
  currentMemory: Memory;
  recentMessages: Message[];
  options?: MemoryInterpreterOptions;
};

type MemoryInterpreterFallbackResponse = {
  topic?: string | null;
  isClosingReply?: boolean | null;
  trackedEntity?: string | null;
  candidates?: Array<{
    phrase?: string;
    kind?: "topic_alias" | "closing_reply";
    normalizedValue?: string | null;
  }>;
};

const SEARCH_PREFIX_RE = /^(?:検索|search)\s*[:：]/i;
const FOLLOW_UP_INVITE_RE =
  /(?:もっと詳しく知りたい|他に知りたいこと|何か他に質問|気軽に声をかけて|いつでも聞いて|お話しできます|教えてくださいね|興味があれば|ありますか)[!！。\s]*$/u;
const META_FACT_RE =
  /^(?:概要|要点|特徴|ユーザーへの質問例|次の提案|不足情報|注意|参考|Summary)\s*[:：]/u;
const LITERATURE_HINT_RE =
  /(?:文学|作家|作品|小説|戯曲|詩人|代表作|元帥|人物|歴史|チェーホフ|ドストエフスキー|トルストイ|プーシキン|ナポレオン)/u;

function normalizeText(text: string) {
  return text.normalize("NFKC").replace(/\s+/g, " ").trim();
}

function normalizeLine(text: string) {
  return normalizeText(text)
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .replace(/^[-*•]\s*/, "")
    .replace(/\*\*/g, "")
    .trim();
}

function stripLeadIn(text: string) {
  return normalizeText(text)
    .replace(/^(?:次は|では|今度は|じゃあ|では次に)\s*/u, "")
    .trim();
}

function stripTopicTail(text: string) {
  return normalizeText(text)
    .replace(/(?:について(?:教えて|知りたい|詳しく|説明して)(?:ください|下さい)?|について知っていますか|について|を知っていますか|のことを知っていますか|で|は)\??$/u, "")
    .replace(/[!！。?？]+$/u, "")
    .trim();
}

function countSentenceMarkers(text: string) {
  return (text.match(/[。！？!?]/gu) || []).length;
}

function looksLikeLongNarrativeText(text: string) {
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

function isSearchDirectiveText(text: string) {
  return SEARCH_PREFIX_RE.test(normalizeText(text));
}

function extractQuestionSubject(text: string) {
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

function normalizeTopicCandidate(text: string) {
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

function applyApprovedMemoryRule(text: string, approvedRules: ApprovedMemoryRule[]) {
  const normalized = normalizeText(text);
  const matched = [...approvedRules]
    .sort(
      (a, b) => normalizeText(b.phrase).length - normalizeText(a.phrase).length
    )
    .find((rule) => {
      const phrase = normalizeText(rule.phrase);
      if (!phrase) return false;
      return normalized === phrase || normalized.includes(phrase);
    });

  if (!matched) return {};
  if (matched.kind === "closing_reply") {
    return { closingReplyOverride: true };
  }
  if (matched.kind === "topic_alias" && matched.normalizedValue) {
    const normalizedValue = normalizeText(matched.normalizedValue);
    return {
      topicSeed: normalizedValue,
      trackedEntityOverride: normalizedValue,
    };
  }
  return {};
}

function buildGoal(topic: string | undefined, fallback?: string) {
  if (topic) return `ユーザーは${topic}について知りたい`;
  return fallback;
}

function buildFollowUpRule(topic: string | undefined, fallback?: string) {
  if (topic) return `短い追質問は、直前の${topic}トピックを引き継いで解釈する`;
  return fallback;
}

function getActiveDocument(currentMemory: Memory, options?: MemoryInterpreterOptions) {
  if (options?.activeDocument && typeof options.activeDocument === "object") {
    return options.activeDocument;
  }

  const activeDocument = currentMemory.lists?.activeDocument;
  if (activeDocument && typeof activeDocument === "object" && !Array.isArray(activeDocument)) {
    return activeDocument as Record<string, unknown>;
  }

  return null;
}

function extractRecentSearchQueries(messages: Message[]) {
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

function extractPreferences(messages: Message[]) {
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

function extractFacts(messages: Message[]) {
  return Array.from(
    new Set(
      messages
        .filter((message) => message.role === "gpt")
        .flatMap((message) => splitIntoFactCandidates(message.text))
        .filter(isUsefulFact)
    )
  ).slice(-8);
}

function extractWorksByEntityFromTable(text: string) {
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

function extractQuotedWorks(text: string) {
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

function isTopicSwitch(currentMemory: Memory, resolvedTopic: string | undefined) {
  const currentTopic = normalizeText(currentMemory.context.currentTopic || "");
  const nextTopic = normalizeText(resolvedTopic || "");
  if (!currentTopic || !nextTopic) return false;
  return currentTopic !== nextTopic;
}

function buildTrackedEntities(
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

function pruneFactsForTopic(
  currentFacts: string[],
  nextFacts: string[],
  topicSwitched: boolean
) {
  if (topicSwitched) return nextFacts;
  return Array.from(new Set([...currentFacts, ...nextFacts])).slice(-12);
}

export function interpretProvisionalMemoryContext(
  input: ProvisionalContextInput
): Memory["context"] {
  const {
    currentMemory,
    inputText,
    currentTaskTitle,
    activeDocumentTitle,
    lastSearchQuery,
  } = input;

  const inputTopic = normalizeTopicCandidate(inputText);
  const searchTopic = normalizeTopicCandidate(lastSearchQuery || "");
  const documentTopic = normalizeTopicCandidate(activeDocumentTitle || "");
  const taskTopic = normalizeTopicCandidate(currentTaskTitle || "");
  const currentTopic = normalizeText(currentMemory.context.currentTopic || "");

  const resolvedTopic =
    inputTopic || searchTopic || documentTopic || taskTopic || currentTopic || undefined;
  const resolvedLastIntent = isClosingReplyText(inputText)
    ? currentMemory.context.lastUserIntent
    : normalizeText(inputText) || currentMemory.context.lastUserIntent;

  return {
    currentTopic: resolvedTopic,
    currentTask: buildGoal(resolvedTopic, currentMemory.context.currentTask),
    followUpRule: buildFollowUpRule(resolvedTopic, currentMemory.context.followUpRule),
    lastUserIntent: resolvedLastIntent,
  };
}

export function interpretMemoryPatch(input: MemoryPatchInput): Partial<Memory> {
  const { currentMemory, recentMessages, options } = input;
  const latestUserMessage =
    [...recentMessages].reverse().find((message) => message.role === "user") || null;
  const latestUserText = normalizeText(latestUserMessage?.text || "");
  const closingOnlyTurn =
    typeof options?.closingReplyOverride === "boolean"
      ? options.closingReplyOverride
      : Boolean(latestUserText) && isClosingReplyText(latestUserText);
  const recentSearchQueries = extractRecentSearchQueries(recentMessages);
  const latestPrompt =
    latestUserText && !isSearchDirectiveText(latestUserText) && !closingOnlyTurn
      ? latestUserText
      : "";

  const activeDocument = getActiveDocument(currentMemory, options);
  const activeDocumentTitle =
    activeDocument && typeof activeDocument.title === "string" ? activeDocument.title : "";
  const activeDocumentExcerpt =
    activeDocument && typeof activeDocument.excerpt === "string" ? activeDocument.excerpt : "";

  const seededTopic = normalizeTopicCandidate(options?.topicSeed || "");
  const promptTopic = normalizeTopicCandidate(latestPrompt);
  const documentTopic = normalizeTopicCandidate(activeDocumentTitle);
  const existingTopic = normalizeText(currentMemory.context.currentTopic || "");
  const resolvedTopic =
    seededTopic || promptTopic || documentTopic || existingTopic || undefined;
  const topicSwitched = isTopicSwitch(currentMemory, resolvedTopic);

  const latestAssistantMessage =
    [...recentMessages].reverse().find((message) => message.role === "gpt") || null;
  const latestAssistantText = latestAssistantMessage?.text || "";
  const factSourceMessages =
    topicSwitched && latestAssistantMessage ? [latestAssistantMessage] : recentMessages;

  const tableWorksByEntity = extractWorksByEntityFromTable(activeDocumentExcerpt);
  const worksAllowed =
    LITERATURE_HINT_RE.test(
      `${resolvedTopic || ""} ${activeDocumentTitle} ${latestAssistantText}`
    ) || Object.keys(tableWorksByEntity).length > 0;
  const quotedWorks = worksAllowed ? extractQuotedWorks(latestAssistantText) : [];

  const existingWorksByEntity =
    !topicSwitched &&
    currentMemory.lists?.worksByEntity &&
    typeof currentMemory.lists.worksByEntity === "object" &&
    !Array.isArray(currentMemory.lists.worksByEntity)
      ? (currentMemory.lists.worksByEntity as Record<string, unknown>)
      : {};

  const worksByEntity =
    Object.keys(tableWorksByEntity).length > 0
      ? {
          ...existingWorksByEntity,
          ...tableWorksByEntity,
          ...(resolvedTopic && quotedWorks.length > 0
            ? {
                [resolvedTopic]: Array.from(
                  new Set([
                    ...(((existingWorksByEntity as Record<string, unknown> | undefined)?.[
                      resolvedTopic
                    ] as string[]) || []),
                    ...quotedWorks,
                  ])
                ).slice(-8),
              }
            : {}),
        }
      : resolvedTopic && quotedWorks.length > 0
        ? {
            ...existingWorksByEntity,
            [resolvedTopic]: Array.from(
              new Set([
                ...(((existingWorksByEntity as Record<string, unknown> | undefined)?.[
                  resolvedTopic
                ] as string[]) || []),
                ...quotedWorks,
              ])
            ).slice(-8),
          }
        : undefined;

  const lists: Record<string, unknown> = {};
  if (activeDocument) lists.activeDocument = activeDocument;
  if (recentSearchQueries.length > 0) lists.recentSearchQueries = recentSearchQueries;

  const trackedEntities = buildTrackedEntities(
    currentMemory,
    options?.trackedEntityOverride || resolvedTopic,
    tableWorksByEntity,
    topicSwitched
  );
  if (trackedEntities.length > 0) lists.trackedEntities = trackedEntities;
  if (worksByEntity && Object.keys(worksByEntity).length > 0) {
    lists.worksByEntity = worksByEntity;
  }

  return {
    facts:
      closingOnlyTurn && !topicSwitched
        ? currentMemory.facts
        : pruneFactsForTopic(currentMemory.facts, extractFacts(factSourceMessages), topicSwitched),
    preferences: extractPreferences(recentMessages),
    lists,
    context: {
      currentTopic: resolvedTopic,
      currentTask: buildGoal(resolvedTopic, currentMemory.context.currentTask),
      followUpRule: buildFollowUpRule(resolvedTopic, currentMemory.context.followUpRule),
      lastUserIntent:
        options?.lastUserIntent || latestPrompt || currentMemory.context.lastUserIntent,
    },
  };
}

function shouldUseMemoryFallback(text: string) {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  if (isSearchDirectiveText(normalized)) return false;
  if (isClosingReplyText(normalized)) return false;
  if (looksLikeLongNarrativeText(text)) return true;

  const candidate = normalizeTopicCandidate(normalized);
  return (
    !candidate ||
    candidate.length > 40 ||
    candidate === normalized.replace(/[!！。?？]+$/u, "").trim() ||
    /^(?:次は|では|今度は|一番興味があるのは)/u.test(normalized) ||
    /(?:について知っていますか|を知っていますか|のことを知っていますか|とは\?|は\?)$/u.test(
      normalized
    )
  );
}

function tryParseMemoryFallbackJson(text: string): MemoryInterpreterFallbackResponse | null {
  const trimmed = text.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as MemoryInterpreterFallbackResponse;
    }
  } catch {}

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(trimmed.slice(start, end + 1));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as MemoryInterpreterFallbackResponse;
      }
    } catch {}
  }
  return null;
}

function buildMemoryFallbackPrompt(args: {
  latestUserText: string;
  currentTopic?: string;
  lastUserIntent?: string;
}) {
  return [
    "You are a memory interpreter for a chat system.",
    "Return JSON only. No markdown. No explanation.",
    "Interpret the latest user message for topic normalization and closing-reply detection.",
    "",
    "Return this shape:",
    "{",
    '  "topic": string | null,',
    '  "isClosingReply": boolean,',
    '  "trackedEntity": string | null,',
    '  "candidates": [',
    '    { "phrase": string, "kind": "topic_alias" | "closing_reply", "normalizedValue": string | null }',
    "  ]",
    "}",
    "",
    "Rules:",
    "- topic should be a concise noun phrase, not the whole question sentence.",
    "- If the user is politely closing or dismissing the topic, set isClosingReply=true and topic=null.",
    "- trackedEntity should be the primary entity name if obvious.",
    "- candidates should only include literal phrases from the latest user text.",
    "",
    `CURRENT_TOPIC: ${args.currentTopic || ""}`,
    `LAST_USER_INTENT: ${args.lastUserIntent || ""}`,
    "LATEST_USER_TEXT_START",
    args.latestUserText,
    "LATEST_USER_TEXT_END",
  ].join("\n");
}

export async function resolveMemoryFallbackOptions(args: {
  latestUserText: string;
  currentMemory: Memory;
  settings: MemoryInterpreterSettings;
  approvedRules: ApprovedMemoryRule[];
}): Promise<{
  optionsPatch: Partial<MemoryInterpreterOptions>;
  pendingCandidates: PendingMemoryRuleCandidate[];
  usedFallback: boolean;
}> {
  const approvedPatch = applyApprovedMemoryRule(args.latestUserText, args.approvedRules);
  if (Object.keys(approvedPatch).length > 0) {
    return {
      optionsPatch: approvedPatch,
      pendingCandidates: [],
      usedFallback: false,
    };
  }

  if (!args.settings.llmFallbackEnabled || !shouldUseMemoryFallback(args.latestUserText)) {
    return { optionsPatch: {}, pendingCandidates: [], usedFallback: false };
  }

  try {
    const res = await fetch("/api/chatgpt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "memory_interpret",
        input: buildMemoryFallbackPrompt({
          latestUserText: args.latestUserText,
          currentTopic: args.currentMemory.context.currentTopic,
          lastUserIntent: args.currentMemory.context.lastUserIntent,
        }),
      }),
    });

    const data = await res.json();
    if (!res.ok || typeof data?.reply !== "string") {
      return { optionsPatch: {}, pendingCandidates: [], usedFallback: false };
    }

    const parsed = tryParseMemoryFallbackJson(data.reply);
    if (!parsed) {
      return { optionsPatch: {}, pendingCandidates: [], usedFallback: false };
    }

    const optionsPatch: Partial<MemoryInterpreterOptions> = {};
    if (typeof parsed.isClosingReply === "boolean") {
      optionsPatch.closingReplyOverride = parsed.isClosingReply;
    }
    if (parsed.topic && typeof parsed.topic === "string") {
      optionsPatch.topicSeed = normalizeText(parsed.topic);
    }
    if (parsed.trackedEntity && typeof parsed.trackedEntity === "string") {
      optionsPatch.trackedEntityOverride = normalizeText(parsed.trackedEntity);
    }

    const pendingCandidates =
      Array.isArray(parsed.candidates) && args.settings.saveRuleCandidates
        ? parsed.candidates
            .map((candidate) => {
              const phrase =
                typeof candidate?.phrase === "string" ? normalizeText(candidate.phrase) : "";
              const kind =
                candidate?.kind === "topic_alias" || candidate?.kind === "closing_reply"
                  ? candidate.kind
                  : null;
              if (!phrase || !kind || !args.latestUserText.includes(phrase)) return null;
              return {
                id: `memcand-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                phrase,
                kind,
                normalizedValue:
                  typeof candidate.normalizedValue === "string"
                    ? normalizeText(candidate.normalizedValue)
                    : undefined,
                createdAt: new Date().toISOString(),
                sourceText: args.latestUserText,
              } as PendingMemoryRuleCandidate;
            })
            .filter((item): item is PendingMemoryRuleCandidate => Boolean(item))
        : [];

    return {
      optionsPatch,
      pendingCandidates,
      usedFallback: true,
    };
  } catch {
    return { optionsPatch: {}, pendingCandidates: [], usedFallback: false };
  }
}
