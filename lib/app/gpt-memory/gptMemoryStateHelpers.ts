import {
  type Memory,
  type MemorySettings,
} from "@/lib/memory";
import {
  normalizeMemoryContextState,
} from "@/lib/app/memory-interpreter/memoryInterpreterContextReducer";
import {
  normalizeText,
} from "@/lib/app/memory-interpreter/memoryInterpreterText";
import type { Message } from "@/types/chat";

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

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
    context: normalizeMemoryContextState(memory.context),
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
