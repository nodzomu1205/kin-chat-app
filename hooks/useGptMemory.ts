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
import type { KinMemoryState, Message } from "@/types/chat";
import { generateId } from "@/lib/uuid";

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
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

const inferTopicFromText = (
  text: string,
  currentTopic?: string
): string | undefined => {
  const normalized = text.trim();
  if (!normalized) return currentTopic;

  if (
    normalized.includes("天気") ||
    normalized.includes("気温") ||
    normalized.includes("雨") ||
    normalized.includes("晴れ") ||
    normalized.includes("曇") ||
    normalized.includes("予報")
  ) {
    return "天気";
  }

  if (
    normalized.includes("GDP") ||
    normalized.includes("経済") ||
    normalized.includes("名目GDP")
  ) {
    return "GDP";
  }

  const shortFollowUp =
    normalized.length <= 12 &&
    (normalized.endsWith("は？") ||
      normalized.endsWith("?") ||
      normalized.endsWith("は") ||
      normalized.endsWith("は?"));

  if (shortFollowUp && currentTopic) {
    return currentTopic;
  }

  return currentTopic;
};

const buildTopicContext = (
  topic: string | undefined,
  currentMemory: Memory
): Memory["context"] => {
  if (!topic) return currentMemory.context;

  if (topic === "天気") {
    return {
      currentTopic: "天気",
      currentTask: "ユーザーは特定の地域の天気を知りたい",
      followUpRule:
        "地名だけの短い追質問は、その地域の天気を聞いているものとして解釈する",
      lastUserIntent: "次の地域の天気を知りたい",
    };
  }

  if (topic === "GDP") {
    return {
      currentTopic: "GDP",
      currentTask: "ユーザーは国や地域のGDP情報を知りたい",
      followUpRule:
        "国名や地域名だけの短い追質問は、その対象のGDP情報を聞いているものとして解釈する",
      lastUserIntent: "次の国や地域のGDPを知りたい",
    };
  }

  return {
    currentTopic: topic,
    currentTask: currentMemory.context.currentTask,
    followUpRule: currentMemory.context.followUpRule,
    lastUserIntent: currentMemory.context.lastUserIntent,
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
    (inputText: string): Memory => {
      const currentMemory = gptStateRef.current.memory;
      const currentTopic = currentMemory.context.currentTopic;

      const inferredTopic = inferTopicFromText(inputText, currentTopic);

      const nextMemory: Memory = {
        ...currentMemory,
        context: {
          ...buildTopicContext(inferredTopic, currentMemory),
          lastUserIntent: inputText,
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

      const nextState: KinMemoryState = {
        memory: trimMemory(current.memory, settings),
        recentMessages: updatedRecent.slice(-settings.chatRecentLimit),
      };

      setGptState(nextState);
      gptStateRef.current = nextState;
      persistKinState(currentKin, nextState);

      return {
        summaryUsage: null,
      };
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