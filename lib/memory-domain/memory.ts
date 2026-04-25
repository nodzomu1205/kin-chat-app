export type MemoryStableLists = Record<string, unknown> & {
  recentSearchQueries?: string[];
};

export type MemoryTaskScopedLists = {
  activeDocument?: unknown;
  worksByEntity?: Record<string, unknown>;
  trackedEntities?: string[];
};

export type MemoryTraceLists = Record<string, unknown>;

export type MemoryLists = MemoryStableLists & MemoryTaskScopedLists & MemoryTraceLists;

export type MemoryStableContext = {
  proposedTopic?: string;
};

export type MemoryTaskScopedContext = {
  currentTopic?: string;
  currentTask?: string;
  followUpRule?: string;
  lastUserIntent?: string;
};

export type MemoryTraceContext = Record<string, unknown>;

export type MemoryContext = MemoryStableContext &
  MemoryTaskScopedContext &
  MemoryTraceContext;

export type Memory = {
  facts: string[];
  preferences: string[];
  lists: MemoryLists;
  context: MemoryContext;
};

export type MemorySettings = {
  maxFacts: number;
  maxPreferences: number;
  chatRecentLimit: number;
  summarizeThreshold: number;
  recentKeep: number;
};

export const DEFAULT_MEMORY_SETTINGS: MemorySettings = {
  maxFacts: 12,
  maxPreferences: 8,
  chatRecentLimit: 10,
  summarizeThreshold: 8,
  recentKeep: 4,
};

export const TASK_SCOPED_MEMORY_LIST_KEYS = [
  "activeDocument",
  "worksByEntity",
  "trackedEntities",
] as const;

export const DISPLAYED_CONTEXT_MEMORY_LIST_KEYS = ["activeDocument"] as const;

export const STABLE_MEMORY_LIST_KEYS = ["recentSearchQueries"] as const;

export const TASK_SCOPED_MEMORY_CONTEXT_KEYS = [
  "currentTopic",
  "currentTask",
  "followUpRule",
  "lastUserIntent",
] as const;

export const STABLE_MEMORY_CONTEXT_KEYS = ["proposedTopic"] as const;

export function createEmptyMemory(): Memory {
  return {
    facts: [],
    preferences: [],
    lists: {},
    context: {},
  };
}

export function normalizeMemoryShape(input: unknown): Memory {
  const obj =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};

  const facts = Array.isArray(obj.facts)
    ? obj.facts.filter((v): v is string => typeof v === "string")
    : [];

  const preferences = Array.isArray(obj.preferences)
    ? obj.preferences.filter((v): v is string => typeof v === "string")
    : [];

  const lists =
    obj.lists &&
    typeof obj.lists === "object" &&
    !Array.isArray(obj.lists)
      ? (obj.lists as Record<string, unknown>)
      : {};

  const rawContext =
    obj.context &&
    typeof obj.context === "object" &&
    !Array.isArray(obj.context)
      ? (obj.context as Record<string, unknown>)
      : {};

  const context: MemoryContext = {
    ...rawContext,
    currentTopic:
      typeof rawContext.currentTopic === "string"
        ? rawContext.currentTopic
        : undefined,
    proposedTopic:
      typeof rawContext.proposedTopic === "string"
        ? rawContext.proposedTopic
        : undefined,
    currentTask:
      typeof rawContext.currentTask === "string"
        ? rawContext.currentTask
        : undefined,
    followUpRule:
      typeof rawContext.followUpRule === "string"
        ? rawContext.followUpRule
        : undefined,
    lastUserIntent:
      typeof rawContext.lastUserIntent === "string"
        ? rawContext.lastUserIntent
        : undefined,
  };

  return {
    facts,
    preferences,
    lists,
    context,
  };
}

export function safeParseMemory(input: string | null | undefined): Memory {
  if (!input) return createEmptyMemory();

  try {
    const parsed = JSON.parse(input);
    return normalizeMemoryShape(parsed);
  } catch {
    return createEmptyMemory();
  }
}

export function mergeMemory(oldMemory: Memory, newMemory: Partial<Memory>): Memory {
  const normalizedOld = normalizeMemoryShape(oldMemory);
  const normalizedNew = normalizeMemoryShape(newMemory);

  return {
    facts: Array.from(new Set([...normalizedOld.facts, ...normalizedNew.facts])),
    preferences: Array.from(
      new Set([...normalizedOld.preferences, ...normalizedNew.preferences])
    ),
    lists: {
      ...normalizedOld.lists,
      ...normalizedNew.lists,
    },
    context: {
      ...normalizedOld.context,
      ...normalizedNew.context,
    },
  };
}

export function memoryToPrompt(memory: Memory): string {
  return JSON.stringify(memory, null, 2);
}

export function normalizeMemorySettings(input: unknown): MemorySettings {
  const obj =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};

  const toNumber = (value: unknown, fallback: number) => {
    return typeof value === "number" && Number.isFinite(value)
      ? value
      : fallback;
  };

  const raw: MemorySettings = {
    maxFacts: toNumber(obj.maxFacts, DEFAULT_MEMORY_SETTINGS.maxFacts),
    maxPreferences: toNumber(
      obj.maxPreferences,
      DEFAULT_MEMORY_SETTINGS.maxPreferences
    ),
    chatRecentLimit: toNumber(
      obj.chatRecentLimit,
      DEFAULT_MEMORY_SETTINGS.chatRecentLimit
    ),
    summarizeThreshold: toNumber(
      obj.summarizeThreshold,
      DEFAULT_MEMORY_SETTINGS.summarizeThreshold
    ),
    recentKeep: toNumber(obj.recentKeep, DEFAULT_MEMORY_SETTINGS.recentKeep),
  };

  const chatRecentLimit = Math.max(2, Math.floor(raw.chatRecentLimit));
  const recentKeep = Math.max(
    1,
    Math.min(Math.floor(raw.recentKeep), chatRecentLimit)
  );
  const summarizeThreshold = Math.max(
    2,
    Math.floor(raw.summarizeThreshold),
    recentKeep
  );

  return {
    maxFacts: Math.max(1, Math.floor(raw.maxFacts)),
    maxPreferences: Math.max(1, Math.floor(raw.maxPreferences)),
    chatRecentLimit,
    summarizeThreshold,
    recentKeep,
  };
}

export function clearTaskScopedMemory(memory: Memory): Memory {
  const currentMemory = normalizeMemoryShape(memory);
  const nextLists: MemoryLists = { ...currentMemory.lists };
  const nextContext: MemoryContext = { ...currentMemory.context };

  for (const key of TASK_SCOPED_MEMORY_LIST_KEYS) {
    delete nextLists[key];
  }

  for (const key of TASK_SCOPED_MEMORY_CONTEXT_KEYS) {
    nextContext[key] = undefined;
  }

  return {
    ...currentMemory,
    lists: nextLists,
    context: nextContext,
  };
}

