import {
  type Memory,
  type MemorySettings,
  mergeMemory,
} from "@/lib/memory";
import {
  interpretMemoryPatch,
} from "@/lib/app/memoryInterpreter";
import {
  isClosingReplyText,
  normalizeText,
} from "@/lib/app/memoryInterpreterText";
import type { MemoryUpdateOptions } from "@/hooks/useChatPageActions";
import type { Message } from "@/types/chat";

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

function getLatestMeaningfulUserText(recentMessages: Message[]) {
  const latestUser = [...recentMessages]
    .reverse()
    .find((message) => message.role === "user");
  const text = normalizeText(latestUser?.text || "");
  if (!text || isClosingReplyText(text)) return "";
  return text;
}

function uniqueTrimmed(items: unknown, max: number): string[] {
  if (!Array.isArray(items)) return [];

  const next = items
    .filter((item): item is string => typeof item === "string")
    .map((item) => normalizeText(item))
    .filter(Boolean);

  return Array.from(new Set(next)).slice(-max);
}

function trimWorksByEntity(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .map(([entity, items]) => [normalizeText(entity), uniqueTrimmed(items, 8)] as const)
    .filter(([entity, items]) => entity && items.length > 0)
    .slice(-6);

  if (entries.length === 0) return undefined;

  return Object.fromEntries(entries);
}

function trimLists(lists: Record<string, unknown>) {
  const next: Record<string, unknown> = {};

  Object.entries(lists || {}).forEach(([key, value]) => {
    if (key === "worksByEntity") {
      const trimmed = trimWorksByEntity(value);
      if (trimmed) next[key] = trimmed;
      return;
    }

    if (Array.isArray(value)) {
      const limit =
        key === "recentSearchQueries" ? 6 : key === "trackedEntities" ? 8 : 10;
      const items = uniqueTrimmed(value, limit);
      if (items.length > 0) {
        next[key] = items;
      }
      return;
    }

    if (value && typeof value === "object") {
      next[key] = value;
      return;
    }

    if (typeof value === "string" && value.trim()) {
      next[key] = normalizeText(value);
    }
  });

  return next;
}

export function trimMemoryState(memory: Memory, settings: MemorySettings): Memory {
  return {
    ...memory,
    facts: Array.from(
      new Set(
        uniqueTrimmed(memory.facts, settings.maxFacts * 2).map((item) => normalizeText(item))
      )
    ).slice(-settings.maxFacts),
    preferences: Array.from(
      new Set(
        uniqueTrimmed(memory.preferences, settings.maxPreferences * 2)
          .map((item) => normalizeText(item))
          .filter(Boolean)
      )
    ).slice(-settings.maxPreferences),
    lists: trimLists(memory.lists && typeof memory.lists === "object" ? memory.lists : {}),
    context: {
      currentTopic:
        typeof memory.context?.currentTopic === "string"
          ? normalizeText(memory.context.currentTopic)
          : undefined,
      currentTask:
        typeof memory.context?.currentTask === "string"
          ? normalizeText(memory.context.currentTask)
          : undefined,
      followUpRule:
        typeof memory.context?.followUpRule === "string"
          ? normalizeText(memory.context.followUpRule)
          : undefined,
      lastUserIntent:
        typeof memory.context?.lastUserIntent === "string"
          ? normalizeText(memory.context.lastUserIntent)
          : undefined,
    },
  };
}

export function hasMeaningfulMemoryState(memory: Memory) {
  const listKeys = Object.keys(memory.lists || {});
  const contextValues = Object.values(memory.context || {}).filter(
    (value) => typeof value === "string" && value.trim()
  );

  return (
    memory.facts.length > 0 ||
    memory.preferences.length > 0 ||
    listKeys.length > 0 ||
    contextValues.length > 0
  );
}

export function normalizeTokenUsage(usage: unknown): TokenUsage | null {
  if (!usage || typeof usage !== "object") return null;

  const obj = usage as Record<string, unknown>;
  const inputTokens =
    typeof obj.inputTokens === "number" && Number.isFinite(obj.inputTokens)
      ? obj.inputTokens
      : 0;
  const outputTokens =
    typeof obj.outputTokens === "number" && Number.isFinite(obj.outputTokens)
      ? obj.outputTokens
      : 0;
  const totalTokens =
    typeof obj.totalTokens === "number" && Number.isFinite(obj.totalTokens)
      ? obj.totalTokens
      : inputTokens + outputTokens;

  return {
    inputTokens,
    outputTokens,
    totalTokens,
  };
}

export function normalizeRecentMessagesState(
  recentMessages: unknown,
  limit: number
): Message[] {
  if (!Array.isArray(recentMessages)) return [];

  return recentMessages
    .filter((item): item is Message => {
      if (!item || typeof item !== "object") return false;

      const msg = item as Record<string, unknown>;
      return (
        typeof msg.id === "string" &&
        typeof msg.role === "string" &&
        typeof msg.text === "string"
      );
    })
    .slice(-limit);
}

export function collectSupplementalMemoryState(
  recentMessages: Message[],
  currentMemory: Memory,
  options?: MemoryUpdateOptions
): Partial<Memory> {
  return interpretMemoryPatch({
    currentMemory,
    recentMessages,
    options,
  });
}

export function getMemoryPressureState(memory: Memory, recentMessages: Message[]) {
  return recentMessages.length + memory.facts.length + memory.preferences.length;
}

export function buildCandidateMemoryState(params: {
  currentMemory: Memory;
  updatedRecent: Message[];
  settings: MemorySettings;
  options?: MemoryUpdateOptions;
}) {
  const { currentMemory, updatedRecent, settings, options } = params;
  const trimmedRecent = updatedRecent.slice(-settings.chatRecentLimit);
  const supplementalMemory = collectSupplementalMemoryState(
    trimmedRecent,
    currentMemory,
    options
  );
  const previousTopic = normalizeText(
    options?.previousCommittedTopic || currentMemory.context.currentTopic || ""
  );
  const nextTopic = normalizeText(
    typeof supplementalMemory.context?.currentTopic === "string"
      ? supplementalMemory.context.currentTopic
      : currentMemory.context.currentTopic || ""
  );
  const topicSwitched = Boolean(previousTopic && nextTopic && previousTopic !== nextTopic);
  const mergeBaseMemory = topicSwitched
    ? {
        ...currentMemory,
        facts: [],
        lists: {
          activeDocument: currentMemory.lists?.activeDocument,
          recentSearchQueries: currentMemory.lists?.recentSearchQueries,
        },
      }
    : currentMemory;

  const candidateMemory = trimMemoryState(
    mergeMemory(mergeBaseMemory, supplementalMemory),
    settings
  );
  const latestMeaningfulUserText = getLatestMeaningfulUserText(trimmedRecent);

  if (latestMeaningfulUserText) {
    candidateMemory.context.lastUserIntent = latestMeaningfulUserText;
  }

  if (
    !topicSwitched &&
    candidateMemory.facts.length === 0 &&
    currentMemory.facts.length > 0
  ) {
    candidateMemory.facts = [...currentMemory.facts].slice(-settings.maxFacts);
  }

  return {
    trimmedRecent,
    supplementalMemory,
    previousTopic,
    nextTopic,
    topicSwitched,
    candidateMemory,
  };
}

function stripIntentLead(text: string) {
  return normalizeText(text)
    .replace(/^(?:次は|では|じゃあ|一番興味があるのは|今度は)\s*/u, "")
    .trim();
}

function deriveFocusedEntity(memory: Memory): string {
  const intent = stripIntentLead(memory.context.lastUserIntent || "");
  const topic = normalizeText(memory.context.currentTopic || "");
  const candidates = new Set<string>();

  const intentCandidate = intent
    .replace(/(?:について.*|とは.*|は\??|で\??|を.*)$/u, "")
    .trim();
  if (intentCandidate) candidates.add(intentCandidate);

  const trackedEntities = Array.isArray(memory.lists?.trackedEntities)
    ? (memory.lists.trackedEntities as string[])
    : [];
  const worksByEntity =
    memory.lists?.worksByEntity &&
    typeof memory.lists.worksByEntity === "object" &&
    !Array.isArray(memory.lists.worksByEntity)
      ? (memory.lists.worksByEntity as Record<string, unknown>)
      : {};

  for (const candidate of candidates) {
    if (candidate && candidate !== topic) return candidate;
  }

  for (const tracked of trackedEntities) {
    if (
      typeof tracked === "string" &&
      tracked &&
      tracked !== topic &&
      Object.prototype.hasOwnProperty.call(worksByEntity, tracked)
    ) {
      return tracked;
    }
  }

  return "";
}

function retainFactsForFocusedEntity(memory: Memory, settings: MemorySettings): Memory {
  const focusedEntity = deriveFocusedEntity(memory);
  if (!focusedEntity) return memory;

  const worksByEntity =
    memory.lists?.worksByEntity &&
    typeof memory.lists.worksByEntity === "object" &&
    !Array.isArray(memory.lists.worksByEntity)
      ? (memory.lists.worksByEntity as Record<string, unknown>)
      : {};
  const focusedWorks = Array.isArray(worksByEntity[focusedEntity])
    ? (worksByEntity[focusedEntity] as unknown[])
        .filter((item): item is string => typeof item === "string")
        .map((item) => normalizeText(item))
        .filter(Boolean)
    : [];
  const siblingKeys = Object.keys(worksByEntity)
    .map((key) => normalizeText(key))
    .filter((key) => key && key !== focusedEntity);
  const siblingWorks = siblingKeys.flatMap((key) =>
    Array.isArray(worksByEntity[key])
      ? (worksByEntity[key] as unknown[])
          .filter((item): item is string => typeof item === "string")
          .map((item) => normalizeText(item))
          .filter(Boolean)
      : []
  );
  const topic = normalizeText(memory.context.currentTopic || "");

  const filteredFacts = memory.facts.filter((fact) => {
    const normalizedFact = normalizeText(fact);
    if (!normalizedFact) return false;
    if (
      normalizedFact.includes(focusedEntity) ||
      focusedWorks.some((work) => work && normalizedFact.includes(work))
    ) {
      return true;
    }
    if (
      siblingKeys.some((key) => key && normalizedFact.includes(key)) ||
      siblingWorks.some((work) => work && normalizedFact.includes(work))
    ) {
      return false;
    }
    return topic ? normalizedFact.includes(topic) : true;
  });

  return {
    ...memory,
    facts: Array.from(new Set(filteredFacts)).slice(-settings.maxFacts),
  };
}

export function mergeSummarizedMemoryState(params: {
  candidateMemory: Memory;
  summarizedCandidate: Memory;
  settings: MemorySettings;
  recentMessages?: Message[];
}) {
  const { candidateMemory, summarizedCandidate, settings, recentMessages = [] } = params;
  const merged = trimMemoryState(
    mergeMemory(candidateMemory, summarizedCandidate),
    settings
  );
  const latestMeaningfulUserText = getLatestMeaningfulUserText(recentMessages);

  const stabilized: Memory = {
    ...merged,
    context: {
      ...merged.context,
      currentTopic: candidateMemory.context.currentTopic,
      currentTask: candidateMemory.context.currentTask,
      followUpRule: candidateMemory.context.followUpRule,
      lastUserIntent:
        latestMeaningfulUserText || candidateMemory.context.lastUserIntent,
    },
  };

  return retainFactsForFocusedEntity(stabilized, settings);
}
