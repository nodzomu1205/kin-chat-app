"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type Memory,
  type MemorySettings,
  createEmptyMemory,
  normalizeMemoryShape,
  normalizeMemorySettings,
  DEFAULT_MEMORY_SETTINGS,
} from "@/lib/memory";
import { resolvePreferredTopicContext } from "@/lib/app/gptContextResolver";
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

const getEmptyKinState = (): KinMemoryState => ({
  memory: createEmptyMemory(),
  recentMessages: [],
});

const uniqueTrimmed = (items: unknown, max: number): string[] => {
  if (!Array.isArray(items)) return [];

  const normalized = items
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  return Array.from(new Set(normalized)).slice(-max);
};

const trimMemory = (memory: Memory, settings: MemorySettings): Memory => {
  return {
    ...memory,
    facts: uniqueTrimmed(memory.facts, settings.maxFacts),
    preferences: uniqueTrimmed(memory.preferences, settings.maxPreferences),
    lists:
      memory.lists && typeof memory.lists === "object" ? memory.lists : {},
    context: {
      currentTopic: memory.context?.currentTopic,
      currentTask: memory.context?.currentTask,
      followUpRule: memory.context?.followUpRule,
      lastUserIntent: memory.context?.lastUserIntent,
    },
  };
};

const normalizeRecentMessages = (
  recentMessages: unknown,
  limit: number
): Message[] => {
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
};

const normalizeUsage = (usage: unknown): TokenUsage | null => {
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
};

export function useGptMemory(currentKin: string | null) {
  const [settings, setSettings] = useState<MemorySettings>(
    DEFAULT_MEMORY_SETTINGS
  );

  const [gptState, setGptState] = useState<KinMemoryState>(getEmptyKinState());
  const gptStateRef = useRef<KinMemoryState>(getEmptyKinState());

  const [kinMemoryMap, setKinMemoryMap] = useState<
    Record<string, KinMemoryState>
  >({});
  const kinMemoryMapRef = useRef<Record<string, KinMemoryState>>({});

  useEffect(() => {
    const saved = localStorage.getItem(MEMORY_SETTINGS_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      setSettings(normalizeMemorySettings(parsed));
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

      for (const [key, value] of Object.entries(parsed)) {
        normalized[key] = {
          memory: trimMemory(normalizeMemoryShape(value?.memory), settings),
          recentMessages: normalizeRecentMessages(
            value?.recentMessages,
            settings.chatRecentLimit
          ),
        };
      }

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
      const needsSummary = trimmedRecent.length >= settings.summarizeThreshold;

      if (!needsSummary) {
        const nextState: KinMemoryState = {
          memory: trimMemory(current.memory, settings),
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
            memory: current.memory,
            messages: trimmedRecent,
          }),
        });

        if (!response.ok) {
          throw new Error(`summarize failed: ${response.status}`);
        }

        const data = await response.json();
        const summarizedMemory = trimMemory(
          normalizeMemoryShape(data?.memory),
          settings
        );

        const nextState: KinMemoryState = {
          memory: summarizedMemory,
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
          memory: trimMemory(current.memory, settings),
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

