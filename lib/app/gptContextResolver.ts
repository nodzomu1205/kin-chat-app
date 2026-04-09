import type { Memory } from "@/lib/memory";

const TOPIC_PRESETS: Record<
  string,
  { currentTask: string; followUpRule: string; lastUserIntent: string }
> = {
  天気: {
    currentTask: "ユーザーは場所や日時の天気を知りたい。",
    followUpRule:
      "場所や時刻が省略された時は直前に話していた天気トピックを優先して解釈する。",
    lastUserIntent: "次の場所や日時の天気を知りたい。",
  },
  GDP: {
    currentTask: "ユーザーは国や地域のGDP情報を知りたい。",
    followUpRule:
      "国名や年度が省略された時は直前に話していたGDPトピックを優先して解釈する。",
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

export function resolveTopicFromText(
  text: string,
  currentTopic?: string
): string | undefined {
  const normalized = text.trim();
  if (!normalized) return currentTopic;

  const lower = normalized.toLowerCase();

  if (
    includesAny(normalized, ["天気", "気温", "湿度", "雨", "晴れ", "予報"]) ||
    includesAny(lower, ["weather", "forecast", "temperature", "rain", "humidity"])
  ) {
    return "天気";
  }

  if (
    includesAny(normalized, ["GDP", "国内総生産", "経済指標"]) ||
    includesAny(lower, ["gdp", "gross domestic product"])
  ) {
    return "GDP";
  }

  const looksLikeShortFollowUp =
    normalized.length <= 24 &&
    (/[?？!！]$/.test(normalized) ||
      includesAny(normalized, ["それ", "その件", "これ", "どれ", "なぜ", "どう"]) ||
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
  const { currentMemory, currentTaskTitle, activeDocumentTitle, lastSearchQuery, inputText } =
    args;

  const memoryTopic = getTrimmedString(currentMemory.context.currentTopic);
  const memoryTask = getTrimmedString(currentMemory.context.currentTask);
  const normalizedTaskTitle = getTrimmedString(currentTaskTitle);
  const normalizedDocumentTitle =
    getTrimmedString(activeDocumentTitle) ||
    getTrimmedString(
      (currentMemory.lists as Record<string, unknown>)?.activeDocument &&
        typeof (currentMemory.lists as Record<string, unknown>).activeDocument === "object"
        ? ((currentMemory.lists as Record<string, unknown>).activeDocument as Record<
            string,
            unknown
          >).title
        : undefined
    );
  const normalizedSearchQuery = getTrimmedString(lastSearchQuery);

  const preferredTopic =
    normalizedTaskTitle ||
    normalizedDocumentTitle ||
    normalizedSearchQuery ||
    memoryTopic ||
    resolveTopicFromText(inputText, memoryTopic);

  const baseContext = buildResolvedTopicContext(preferredTopic, currentMemory);

  return {
    ...baseContext,
    currentTopic: preferredTopic,
    currentTask: normalizedTaskTitle || memoryTask || baseContext.currentTask,
    lastUserIntent: inputText,
  };
}
