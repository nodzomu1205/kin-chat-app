"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type Memory,
  type MemorySettings,
  createEmptyMemory,
  mergeMemory,
  normalizeMemoryShape,
  normalizeMemorySettings,
  DEFAULT_MEMORY_SETTINGS,
} from "@/lib/memory";
import {
  normalizePromptTopic,
  resolvePreferredTopicContext,
} from "@/lib/app/gptContextResolver";
import type { KinMemoryState, Message } from "@/types/chat";

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

type ProvisionalMemoryOptions = {
  currentTaskTitle?: string;
  activeDocumentTitle?: string;
  lastSearchQuery?: string;
};

const KIN_MEMORY_MAP_KEY = "kin_memory_map";
const MEMORY_SETTINGS_KEY = "gpt_memory_settings";
const SEARCH_PREFIX_RE = /^(?:検索|search)\s*[:：]/i;
const ACK_ONLY_RE =
  /^(?:へー|ほー|なるほど|そうなんですね|そうなんだ|了解|承知|ありがとう|thanks|ok|okay|got it|i see)[!！?？。.\s]*$/i;
const LIST_DELIMITER_RE = /[、,，・\/]/;
const TITLE_STOPWORD_RE =
  /(?:について|とは|教えて|知りたい|お願い|ください|詳しく|簡潔|日本語|英語|作品|代表作|小説|特徴|教えて下さい)$/;
const SENTENCE_FACT_RE =
  /(?:です|である|でした|します|した|された|されている|を描く|を描いている|を扱う|が舞台|が特徴|をテーマ|を残した|で知られる|is|was|are|were|has|have|includes|contains|depicts|portrays|features|known for)/i;
const FOLLOW_UP_INVITE_RE =
  /(?:ありますか|ありますでしょうか|もっと.*(?:話|教)|他にも.*(?:知りたい|ありますか)|興味.*ありますか|できますよ|教えてくださいね|聞いてくださいね)$/i;

const getEmptyKinState = (): KinMemoryState => ({
  memory: createEmptyMemory(),
  recentMessages: [],
});

function normalizeText(text: string) {
  return text.normalize("NFKC").replace(/\s+/g, " ").trim();
}

function normalizeBulletLine(line: string) {
  return normalizeText(line)
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .replace(/^[-*•]\s*/, "")
    .replace(/\*\*/g, "")
    .trim();
}

function isAckText(text: string) {
  return ACK_ONLY_RE.test(normalizeText(text));
}

function uniqueTrimmed(items: unknown, max: number): string[] {
  if (!Array.isArray(items)) return [];

  const next = items
    .filter((item): item is string => typeof item === "string")
    .map((item) => normalizeText(item))
    .filter(Boolean);

  return Array.from(new Set(next)).slice(-max);
}

function sanitizePreferenceItem(text: string) {
  const normalized = normalizeText(text);
  if (!normalized) return "";

  if (/日本語/.test(normalized) || /in japanese/i.test(normalized)) {
    return "日本語で回答してほしい";
  }
  if (/英語/.test(normalized) || /in english/i.test(normalized)) {
    return "英語で回答してほしい";
  }
  if (/簡潔|短め|brief|concisely/i.test(normalized)) {
    return "簡潔に回答してほしい";
  }
  if (/具体例|例を|with examples?/i.test(normalized)) {
    return "具体例を含めてほしい";
  }
  if (/箇条書き|bullet/i.test(normalized)) {
    return "箇条書きで回答してほしい";
  }
  if (/日本に限定|日本中心|focus on japan/i.test(normalized)) {
    return "日本を優先して扱ってほしい";
  }
  if (/段階的|step by step/i.test(normalized)) {
    return "段階的に説明してほしい";
  }

  return "";
}

function sanitizeFactCandidate(text: string) {
  const normalized = normalizeBulletLine(text)
    .replace(/^これまでの話をまとめると[、,:：]?\s*/i, "")
    .replace(/^以下のようになります[、,:：]?\s*/i, "")
    .replace(/^特徴[、,:：]?\s*/i, "")
    .trim();

  return normalized;
}

function isUsefulFactCandidate(text: string) {
  const normalized = sanitizeFactCandidate(text);

  if (!normalized) return false;
  if (normalized.length < 10 || normalized.length > 140) return false;
  if (SEARCH_PREFIX_RE.test(normalized)) return false;
  if (isAckText(normalized)) return false;
  if (/^\[search debug\]/i.test(normalized)) return false;
  if (/^https?:\/\//i.test(normalized)) return false;
  if (/[?？]$/.test(normalized)) return false;
  if (/^(参考リンク|sources?|summary|query|output_mode)\b/i.test(normalized)) {
    return false;
  }

  return SENTENCE_FACT_RE.test(normalized);
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

const trimMemory = (memory: Memory, settings: MemorySettings): Memory => {
  return {
    ...memory,
    facts: Array.from(
      new Set(
        uniqueTrimmed(memory.facts, settings.maxFacts * 2).filter(isUsefulFactCandidate)
      )
    ).slice(-settings.maxFacts),
    preferences: Array.from(
      new Set(
        uniqueTrimmed(memory.preferences, settings.maxPreferences * 2)
          .map(sanitizePreferenceItem)
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
};

const hasMeaningfulMemory = (memory: Memory) => {
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
};

function normalizeUsage(usage: unknown): TokenUsage | null {
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

function normalizeRecentMessages(
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

function extractMeaningfulUserPrompts(messages: Message[]) {
  return messages
    .filter((message) => message.role === "user")
    .map((message) => normalizeText(message.text))
    .filter(Boolean)
    .filter((text) => !SEARCH_PREFIX_RE.test(text))
    .filter((text) => !isAckText(text))
    .slice(-6);
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

function extractPreferences(messages: Message[]) {
  return Array.from(
    new Set(
      messages
        .filter((message) => message.role === "user")
        .map((message) => sanitizePreferenceItem(message.text))
        .filter(Boolean)
    )
  ).slice(-6);
}

function extractFacts(messages: Message[]) {
  return Array.from(
    new Set(
      messages
        .filter((message) => message.role === "gpt")
        .flatMap((message) => message.text.split(/\r?\n/))
        .map((line) => sanitizeFactCandidate(line))
        .filter(isUsefulFactCandidate)
    )
  ).slice(-8);
}

function extractEntityFromPrompt(prompt: string) {
  const normalized = normalizeText(prompt).replace(SEARCH_PREFIX_RE, "").trim();
  if (!normalized) return "";

  const patterns = [
    /^(.+?)の(?:代表作|作品|小説|物語|特徴|概要|内容)/,
    /^(.+?)について/,
    /^(.+?)(?:とは|は？|は\?|は$)/,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    const candidate = normalizeText(match?.[1] || "").replace(TITLE_STOPWORD_RE, "");
    if (candidate && candidate.length >= 2 && candidate.length <= 30) {
      return candidate;
    }
  }

  const fallback = normalizePromptTopic(normalized);
  if (!fallback) return "";
  if (fallback.length < 2 || fallback.length > 30) return "";
  return fallback.replace(TITLE_STOPWORD_RE, "").trim();
}

function extractTitleFromLine(line: string) {
  const normalized = normalizeBulletLine(line);
  if (!normalized || isAckText(normalized)) return "";
  if (/[?？]$/.test(normalized)) return "";
  if (FOLLOW_UP_INVITE_RE.test(normalized)) return "";

  const quotedTitles = Array.from(
    normalized.matchAll(/[『「]([^』」]{2,40})[』」]/g),
    (match) => normalizeText(match[1] || "")
  ).filter(Boolean);

  if (quotedTitles.length > 0) {
    return quotedTitles.join("、");
  }

  const directMatch = normalized.match(
    /^(.{2,40}?)(?:[（(]\d{3,4}.*?[)）]|[-:：]\s| - )/
  );
  if (directMatch?.[1]) {
    const title = normalizeText(directMatch[1]);
    if (!/です|である|した|して/.test(title)) {
      return title;
    }
  }

  const listMatch = normalized.match(/(?:代表作|作品|著作)[は:：]\s*(.+)$/);
  if (listMatch?.[1]) {
    return listMatch[1];
  }

  return "";
}

function extractWorksFromAssistantMessage(text: string) {
  const titles = new Set<string>();

  text.split(/\r?\n/).forEach((rawLine) => {
    const normalizedLine = normalizeBulletLine(rawLine);
    if (!normalizedLine || /[?？]$/.test(normalizedLine)) return;
    if (FOLLOW_UP_INVITE_RE.test(normalizedLine)) return;

    const titleOrList = extractTitleFromLine(rawLine);
    if (!titleOrList) return;

    titleOrList
      .split(LIST_DELIMITER_RE)
      .map((item) => normalizeText(item))
      .map((item) =>
        item
          .replace(/^「|」$/g, "")
          .replace(/^『|』$/g, "")
          .replace(TITLE_STOPWORD_RE, "")
          .trim()
      )
      .filter((item) => item.length >= 2 && item.length <= 40)
      .filter((item) => !/です|である|した|して/.test(item))
      .filter((item) => !FOLLOW_UP_INVITE_RE.test(item))
      .filter((item) => !/[?？]$/.test(item))
      .forEach((item) => {
        titles.add(item);
      });
  });

  return Array.from(titles).slice(-8);
}

function buildWorkingContext(params: {
  currentMemory: Memory;
  recentMessages: Message[];
}) {
  const { currentMemory, recentMessages } = params;
  const recentUserPrompts = extractMeaningfulUserPrompts(recentMessages);
  const recentSearchQueries = extractRecentSearchQueries(recentMessages);
  const latestPrompt = recentUserPrompts[recentUserPrompts.length - 1] || "";
  const latestSearch = recentSearchQueries[recentSearchQueries.length - 1] || "";
  const normalizedTopic =
    normalizePromptTopic(latestSearch || latestPrompt) ||
    currentMemory.context.currentTopic ||
    "";

  return {
    currentTopic: normalizedTopic || undefined,
    currentTask: normalizedTopic
      ? `ユーザーは${normalizedTopic}について知りたい`
      : currentMemory.context.currentTask,
    followUpRule: normalizedTopic
      ? `短い追質問は、直前の${normalizedTopic}トピックを引き継いで解釈する`
      : currentMemory.context.followUpRule,
    lastUserIntent: latestPrompt || currentMemory.context.lastUserIntent,
  };
}

function collectSupplementalMemory(
  recentMessages: Message[],
  currentMemory: Memory
): Partial<Memory> {
  const recentSearchQueries = extractRecentSearchQueries(recentMessages);
  const preferences = extractPreferences(recentMessages);
  const facts = extractFacts(recentMessages);
  const meaningfulUserPrompts = extractMeaningfulUserPrompts(recentMessages);
  const latestPrompt = meaningfulUserPrompts[meaningfulUserPrompts.length - 1] || "";
  const latestAssistantMessage =
    [...recentMessages].reverse().find((message) => message.role === "gpt")?.text || "";
  const activeEntity = extractEntityFromPrompt(latestPrompt);
  const extractedWorks = extractWorksFromAssistantMessage(latestAssistantMessage);

  const lists: Record<string, unknown> = {};

  if (recentSearchQueries.length > 0) {
    lists.recentSearchQueries = recentSearchQueries;
  }

  const trackedEntities = Array.from(
    new Set([
      ...uniqueTrimmed((currentMemory.lists as Record<string, unknown>)?.trackedEntities, 8),
      activeEntity,
    ].filter(Boolean))
  ).slice(-8);

  if (trackedEntities.length > 0) {
    lists.trackedEntities = trackedEntities;
  }

  if (activeEntity && extractedWorks.length > 0) {
    const existing =
      (currentMemory.lists as Record<string, unknown>)?.worksByEntity &&
      typeof (currentMemory.lists as Record<string, unknown>).worksByEntity === "object" &&
      !Array.isArray((currentMemory.lists as Record<string, unknown>).worksByEntity)
        ? ((currentMemory.lists as Record<string, unknown>).worksByEntity as Record<
            string,
            unknown
          >)
        : {};

    lists.worksByEntity = {
      ...existing,
      [activeEntity]: Array.from(
        new Set([
          ...uniqueTrimmed(existing[activeEntity], 8),
          ...extractedWorks,
        ])
      ).slice(-8),
    };
  }

  return {
    facts,
    preferences,
    lists,
    context: buildWorkingContext({
      currentMemory,
      recentMessages,
    }),
  };
}

function getMemoryPressure(memory: Memory, recentMessages: Message[]) {
  return (
    recentMessages.length +
    memory.facts.length +
    memory.preferences.length
  );
}

export function useGptMemory(currentKin: string | null) {
  const [settings, setSettings] = useState<MemorySettings>(DEFAULT_MEMORY_SETTINGS);
  const [gptState, setGptState] = useState<KinMemoryState>(getEmptyKinState());
  const gptStateRef = useRef<KinMemoryState>(getEmptyKinState());
  const [kinMemoryMap, setKinMemoryMap] = useState<Record<string, KinMemoryState>>({});
  const kinMemoryMapRef = useRef<Record<string, KinMemoryState>>({});

  useEffect(() => {
    const saved = localStorage.getItem(MEMORY_SETTINGS_KEY);
    if (!saved) return;

    try {
      setSettings(normalizeMemorySettings(JSON.parse(saved)));
    } catch {
      console.warn("memory settings parse failed");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(MEMORY_SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const saved = localStorage.getItem(KIN_MEMORY_MAP_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as Record<string, KinMemoryState>;
      const normalized: Record<string, KinMemoryState> = {};

      Object.entries(parsed).forEach(([key, value]) => {
        normalized[key] = {
          memory: trimMemory(normalizeMemoryShape(value?.memory), settings),
          recentMessages: normalizeRecentMessages(
            value?.recentMessages,
            settings.chatRecentLimit
          ),
        };
      });

      setKinMemoryMap(normalized);
      kinMemoryMapRef.current = normalized;
    } catch {
      console.warn("kin_memory_map parse failed");
    }
  }, [settings]);

  useEffect(() => {
    kinMemoryMapRef.current = kinMemoryMap;
    localStorage.setItem(KIN_MEMORY_MAP_KEY, JSON.stringify(kinMemoryMap));
  }, [kinMemoryMap]);

  useEffect(() => {
    if (!currentKin) {
      const empty = getEmptyKinState();
      setGptState(empty);
      gptStateRef.current = empty;
      return;
    }

    const saved = kinMemoryMapRef.current[currentKin] ?? getEmptyKinState();
    const nextState = {
      memory: trimMemory(saved.memory, settings),
      recentMessages: saved.recentMessages.slice(-settings.chatRecentLimit),
    };

    setGptState(nextState);
    gptStateRef.current = nextState;
  }, [currentKin, settings, kinMemoryMap]);

  useEffect(() => {
    gptStateRef.current = gptState;
  }, [gptState]);

  const persistKinState = useCallback(
    (kin: string | null, state: KinMemoryState) => {
      if (!kin) return;

      const cleanedState = {
        memory: trimMemory(state.memory, settings),
        recentMessages: state.recentMessages.slice(-settings.chatRecentLimit),
      };

      setKinMemoryMap((prev) => ({
        ...prev,
        [kin]: cleanedState,
      }));
    },
    [settings]
  );

  const removeKinState = useCallback((kin: string) => {
    setKinMemoryMap((prev) => {
      const next = { ...prev };
      delete next[kin];
      return next;
    });
  }, []);

  const ensureKinState = useCallback(
    (kin: string | null) => {
      if (!kin) return;
      if (kinMemoryMapRef.current[kin]) return;
      persistKinState(kin, getEmptyKinState());
    },
    [persistKinState]
  );

  const getProvisionalMemory = useCallback(
    (inputText: string, options?: ProvisionalMemoryOptions): Memory => {
      const currentMemory = gptStateRef.current.memory;

      const nextMemory: Memory = {
        ...currentMemory,
        context: {
          ...resolvePreferredTopicContext({
            inputText,
            currentMemory,
            currentTaskTitle: options?.currentTaskTitle,
            activeDocumentTitle: options?.activeDocumentTitle,
            lastSearchQuery: options?.lastSearchQuery,
          }),
        },
      };

      return trimMemory(nextMemory, settings);
    },
    [settings]
  );

  const handleGptMemory = useCallback(
    async (
      updatedRecent: Message[]
    ): Promise<{ summaryUsage: TokenUsage | null }> => {
      const current = gptStateRef.current;
      const trimmedRecent = updatedRecent.slice(-settings.chatRecentLimit);
      const supplementalMemory = collectSupplementalMemory(
        trimmedRecent,
        current.memory
      );
      const candidateMemory = trimMemory(
        mergeMemory(current.memory, supplementalMemory),
        settings
      );
      const memoryCapacity =
        settings.chatRecentLimit + settings.maxFacts + settings.maxPreferences;
      const recentEligible = trimmedRecent.length >= settings.summarizeThreshold;
      const recentIsFull = trimmedRecent.length >= settings.chatRecentLimit;
      const totalPressure = getMemoryPressure(candidateMemory, trimmedRecent);
      const memoryIsOverCapacity = totalPressure > memoryCapacity;
      const needsSummary =
        (recentEligible && recentIsFull) ||
        (recentEligible && memoryIsOverCapacity);

      if (!needsSummary) {
        const nextState: KinMemoryState = {
          memory: candidateMemory,
          recentMessages: trimmedRecent,
        };

        setGptState(nextState);
        gptStateRef.current = nextState;
        persistKinState(currentKin, nextState);

        return { summaryUsage: null };
      }

      try {
        const response = await fetch("/api/chatgpt", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode: "summarize",
            memory: candidateMemory,
            messages: trimmedRecent,
          }),
        });

        if (!response.ok) {
          throw new Error(`summarize failed: ${response.status}`);
        }

        const data = await response.json();
        const summarizedCandidate = trimMemory(
          normalizeMemoryShape(data?.memory),
          settings
        );
        const nextMemory = hasMeaningfulMemory(summarizedCandidate)
          ? trimMemory(mergeMemory(candidateMemory, summarizedCandidate), settings)
          : candidateMemory;

        const nextState: KinMemoryState = {
          memory: nextMemory,
          recentMessages: trimmedRecent.slice(-settings.recentKeep),
        };

        setGptState(nextState);
        gptStateRef.current = nextState;
        persistKinState(currentKin, nextState);

        return {
          summaryUsage: normalizeUsage(data?.usage),
        };
      } catch (error) {
        console.error("gpt memory summarize failed", error);

        const fallbackState: KinMemoryState = {
          memory: candidateMemory,
          recentMessages: trimmedRecent,
        };

        setGptState(fallbackState);
        gptStateRef.current = fallbackState;
        persistKinState(currentKin, fallbackState);

        return { summaryUsage: null };
      }
    },
    [currentKin, persistKinState, settings]
  );

  const resetGptForCurrentKin = useCallback(() => {
    const nextState = getEmptyKinState();
    setGptState(nextState);
    gptStateRef.current = nextState;
    persistKinState(currentKin, nextState);
  }, [currentKin, persistKinState]);

  const updateMemorySettings = useCallback((next: MemorySettings) => {
    setSettings(normalizeMemorySettings(next));
  }, []);

  const resetMemorySettings = useCallback(() => {
    setSettings(DEFAULT_MEMORY_SETTINGS);
  }, []);

  return {
    gptState,
    setGptState,
    gptStateRef,
    getProvisionalMemory,
    handleGptMemory,
    resetGptForCurrentKin,
    ensureKinState,
    removeKinState,
    chatRecentLimit: settings.chatRecentLimit,
    memorySettings: settings,
    updateMemorySettings,
    resetMemorySettings,
    defaultMemorySettings: DEFAULT_MEMORY_SETTINGS,
  };
}
