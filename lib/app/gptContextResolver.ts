import type { Memory } from "@/lib/memory";

const TOPIC_PRESETS: Record<
  string,
  { currentTask: string; followUpRule: string; lastUserIntent: string }
> = {
  天気: {
    currentTask: "ユーザーは場所や日時ごとの天気を知りたい。",
    followUpRule:
      "地名だけの短い追質問は、直前の天気トピックを引き継いで解釈する。",
    lastUserIntent: "次の場所や日時の天気を知りたい。",
  },
  GDP: {
    currentTask: "ユーザーは国や地域のGDP情報を知りたい。",
    followUpRule:
      "国名や年度だけの短い追質問は、直前のGDPトピックを引き継いで解釈する。",
    lastUserIntent: "次の国や地域のGDPを知りたい。",
  },
};

export type ProvisionalTopicContextInput = {
  inputText: string;
  currentMemory: Memory;
  currentTaskTitle?: string;
  activeDocumentTitle?: string;
  lastSearchQuery?: string;
};

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function normalizeFreeText(text: string) {
  return text.normalize("NFKC").replace(/\s+/g, " ").trim();
}

function isDismissiveOrClosingText(text: string) {
  const normalized = normalizeFreeText(text);
  if (!normalized) return true;

  const phrases = [
    "ありがとう",
    "有難う",
    "いいです",
    "大丈夫",
    "結構",
    "この話題は一旦いい",
    "この話題は一旦大丈夫",
    "もう十分",
    "ひとまずいい",
  ];

  return phrases.some((phrase) => normalized.includes(phrase));
}

function stripLeadIn(text: string) {
  return normalizeFreeText(text).replace(
    /^(?:はい|ええ|うん|へー|へえ|そうなんですね|なるほど|たしかに|確かに|ありがとうございます|ありがとう)[、。,\s]*/iu,
    ""
  );
}

function trimTopicCandidate(value: string) {
  return stripLeadIn(value)
    .replace(/^(?:次は|次に|次の?)\s*/iu, "")
    .replace(/^(?:やはり|やっぱり|特に|一番|いちばん|最も)[、。,\s]*/iu, "")
    .replace(
      /(?:について|に関して|に関する|を中心に|のこと|って何|とは何|とは|って)[、。,\s]*$/iu,
      ""
    )
    .replace(/[、。,.!！?？\s]+$/gu, "")
    .trim();
}

export function normalizePromptTopic(text: string) {
  const normalized = normalizeFreeText(text).replace(/^検索[:：]\s*/iu, "").trim();
  if (!normalized) return "";
  if (isDismissiveOrClosingText(normalized)) return "";

  const strongPatterns: Array<[RegExp, number]> = [
    [/^(?:一番|いちばん|最も)?興味があるのは(.+?)(?:です|でした)?[。.!！?？]*$/iu, 1],
    [/^(.+?)について(?:詳しく)?教えて(?:ください|下さい)?[。.!！?？]*$/iu, 1],
    [/^(.+?)について知りたい(?:です)?[。.!！?？]*$/iu, 1],
    [/^(.+?)を(?:もっと)?知りたい(?:です)?[。.!！?？]*$/iu, 1],
    [/^(.+?)に興味があります[。.!！?？]*$/iu, 1],
    [/^(.+?)は知っていますか[。.!！?？]*$/iu, 1],
    [/^(.+?)って知っていますか[。.!！?？]*$/iu, 1],
    [/^(.+?)はありますか[。.!！?？]*$/iu, 1],
  ];

  const stripped = stripLeadIn(normalized);
  for (const [pattern, groupIndex] of strongPatterns) {
    const match = stripped.match(pattern);
    if (!match) continue;
    const candidate = trimTopicCandidate(match[groupIndex] || "");
    if (candidate && !isDismissiveOrClosingText(candidate)) return candidate;
  }

  const candidate = trimTopicCandidate(stripped);
  if (!candidate) return "";
  if (isDismissiveOrClosingText(candidate)) return "";

  if (
    /(?:ですか|ますか|でしょうか|ませんか)$/iu.test(candidate) ||
    candidate.includes("知っていますか")
  ) {
    return "";
  }

  return candidate;
}

export function resolveTopicFromText(
  text: string,
  currentTopic?: string
): string | undefined {
  const normalized = normalizeFreeText(text);
  if (!normalized) return currentTopic;

  const lower = normalized.toLowerCase();

  if (
    includesAny(normalized, ["天気", "気温", "湿度", "雨", "予報", "天候"]) ||
    includesAny(lower, ["weather", "forecast", "temperature", "rain", "humidity"])
  ) {
    return "天気";
  }

  if (
    includesAny(normalized, ["GDP", "国内総生産", "経済規模"]) ||
    includesAny(lower, ["gdp", "gross domestic product"])
  ) {
    return "GDP";
  }

  const looksLikeShortFollowUp =
    normalized.length <= 24 &&
    (/[?？]$/u.test(normalized) ||
      includesAny(normalized, ["それ", "それは", "これ", "どれ", "なに", "どう"]) ||
      includesAny(lower, ["it", "that", "what", "why", "where", "how"]));

  if (looksLikeShortFollowUp && currentTopic) {
    return currentTopic;
  }

  return currentTopic;
}

export function buildResolvedTopicContext(
  topic: string | undefined,
  currentMemory: Memory
): Memory["context"] {
  if (!topic) return currentMemory.context;

  const preset = TOPIC_PRESETS[topic];
  if (preset) {
    return {
      currentTopic: topic,
      currentTask: preset.currentTask,
      followUpRule: preset.followUpRule,
      lastUserIntent: preset.lastUserIntent,
    };
  }

  return {
    currentTopic: topic,
    currentTask: currentMemory.context.currentTask,
    followUpRule: currentMemory.context.followUpRule,
    lastUserIntent: currentMemory.context.lastUserIntent,
  };
}

function getTrimmedString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function resolvePreferredTopicContext(
  args: ProvisionalTopicContextInput
): Memory["context"] {
  const {
    currentMemory,
    currentTaskTitle,
    activeDocumentTitle,
    lastSearchQuery,
    inputText,
  } = args;

  const memoryTopic = getTrimmedString(currentMemory.context.currentTopic);
  const memoryTask = getTrimmedString(currentMemory.context.currentTask);
  const normalizedTaskTitle = getTrimmedString(currentTaskTitle);
  const normalizedDocumentTitle =
    getTrimmedString(activeDocumentTitle) ||
    getTrimmedString(
      (currentMemory.lists as Record<string, unknown>)?.activeDocument &&
        typeof (currentMemory.lists as Record<string, unknown>).activeDocument ===
          "object"
        ? ((currentMemory.lists as Record<string, unknown>).activeDocument as Record<
            string,
            unknown
          >).title
        : undefined
    );
  const normalizedSearchQuery = getTrimmedString(lastSearchQuery);
  const normalizedInputTopic = getTrimmedString(normalizePromptTopic(inputText));

  const preferredTopic =
    normalizedTaskTitle ||
    normalizedDocumentTitle ||
    normalizedSearchQuery ||
    normalizedInputTopic ||
    memoryTopic ||
    resolveTopicFromText(inputText, memoryTopic);

  const baseContext = buildResolvedTopicContext(preferredTopic, currentMemory);

  return {
    ...baseContext,
    currentTopic: preferredTopic,
    currentTask:
      normalizedTaskTitle || preferredTopic || memoryTask || baseContext.currentTask,
    lastUserIntent: inputText,
  };
}
