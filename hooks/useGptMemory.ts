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
import { interpretProvisionalMemoryContext } from "@/lib/app/memoryInterpreter";
import {
  buildCandidateMemoryState,
  hasMeaningfulMemoryState,
  mergeSummarizedMemoryState,
  normalizeRecentMessagesState,
  normalizeTokenUsage,
  trimMemoryState,
  type TokenUsage,
} from "@/lib/app/gptMemoryStateHelpers";
import type {
  ApprovedMemoryRule,
  MemoryInterpreterSettings,
  PendingMemoryRuleCandidate,
} from "@/lib/memoryInterpreterRules";
import { getMemoryRuleSignature } from "@/lib/memoryInterpreterRules";
import { resolveMemoryFallbackOptions } from "@/lib/app/memoryInterpreter";
import type { MemoryUpdateOptions } from "@/hooks/useChatPageActions";
import type { KinMemoryState, Message } from "@/types/chat";

export type { TokenUsage } from "@/lib/app/gptMemoryStateHelpers";

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

type UseGptMemoryOptions = {
  memoryInterpreterSettings: MemoryInterpreterSettings;
  approvedMemoryRules: ApprovedMemoryRule[];
  rejectedMemoryRuleCandidateSignatures: string[];
  onAddPendingMemoryRuleCandidates: (candidates: PendingMemoryRuleCandidate[]) => void;
};

export function useGptMemory(
  currentKin: string | null,
  config: UseGptMemoryOptions
) {
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
          memory: trimMemoryState(normalizeMemoryShape(value?.memory), settings),
          recentMessages: normalizeRecentMessagesState(
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
    const nextState: KinMemoryState = {
      memory: trimMemoryState(saved.memory, settings),
      recentMessages: saved.recentMessages.slice(-settings.chatRecentLimit),
    };

    setGptState(nextState);
    gptStateRef.current = nextState;
  }, [currentKin, settings]);

  useEffect(() => {
    gptStateRef.current = gptState;
  }, [gptState]);

  const persistKinState = useCallback(
    (kin: string | null, state: KinMemoryState) => {
      if (!kin) return;

      const cleanedState: KinMemoryState = {
        memory: trimMemoryState(state.memory, settings),
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

  const applyPersistedState = useCallback(
    (state: KinMemoryState) => {
      setGptState(state);
      gptStateRef.current = state;
      persistKinState(currentKin, state);
    },
    [currentKin, persistKinState]
  );

  const getProvisionalMemory = useCallback(
    (inputText: string, options?: ProvisionalMemoryOptions): Memory => {
      const currentMemory = gptStateRef.current.memory;

      const nextMemory: Memory = {
        ...currentMemory,
        context: {
          ...interpretProvisionalMemoryContext({
            inputText,
            currentMemory,
            currentTaskTitle: options?.currentTaskTitle,
            activeDocumentTitle: options?.activeDocumentTitle,
            lastSearchQuery: options?.lastSearchQuery,
          }),
        },
      };

      return trimMemoryState(nextMemory, settings);
    },
    [settings]
  );

  const handleGptMemory = useCallback(
    async (
      updatedRecent: Message[],
      options?: MemoryUpdateOptions
    ): Promise<{ summaryUsage: TokenUsage | null }> => {
      const current = gptStateRef.current;
      const latestUser = [...updatedRecent]
        .reverse()
        .find((message) => message.role === "user");
      const latestUserText = typeof latestUser?.text === "string" ? latestUser.text : "";
      const fallbackResult = latestUserText
        ? await resolveMemoryFallbackOptions({
            latestUserText,
            currentMemory: current.memory,
            settings: config.memoryInterpreterSettings,
            approvedRules: config.approvedMemoryRules,
          })
        : { optionsPatch: {}, pendingCandidates: [], usedFallback: false };
      if (fallbackResult.pendingCandidates.length > 0) {
        const filtered = fallbackResult.pendingCandidates.filter((candidate) => {
          const signature = getMemoryRuleSignature(candidate);
          return !config.rejectedMemoryRuleCandidateSignatures.includes(signature);
        });
        if (filtered.length > 0) {
          config.onAddPendingMemoryRuleCandidates(filtered);
        }
      }
      const memoryUpdateOptions: MemoryUpdateOptions = {
        ...options,
        ...fallbackResult.optionsPatch,
      };
      const { trimmedRecent, candidateMemory } = buildCandidateMemoryState({
        currentMemory: current.memory,
        updatedRecent,
        settings,
        options: memoryUpdateOptions,
      });

      const memoryCapacity =
        settings.chatRecentLimit + settings.maxFacts + settings.maxPreferences;
      const recentEligible = trimmedRecent.length >= settings.summarizeThreshold;
      const recentIsFull = trimmedRecent.length >= settings.chatRecentLimit;
      const totalPressure =
        trimmedRecent.length + candidateMemory.facts.length + candidateMemory.preferences.length;
      const memoryIsOverCapacity = totalPressure > memoryCapacity;
      const needsSummary =
        (recentEligible && recentIsFull) ||
        (recentEligible && memoryIsOverCapacity);

      if (!needsSummary) {
        const nextState: KinMemoryState = {
          memory: candidateMemory,
          recentMessages: trimmedRecent,
        };

        applyPersistedState(nextState);
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
        const summarizedCandidate = trimMemoryState(
          normalizeMemoryShape(data?.memory),
          settings
        );
        const nextMemory = hasMeaningfulMemoryState(summarizedCandidate)
          ? mergeSummarizedMemoryState({
              candidateMemory,
              summarizedCandidate,
              settings,
              recentMessages: trimmedRecent,
            })
          : candidateMemory;

        const nextState: KinMemoryState = {
          memory: nextMemory,
          recentMessages: trimmedRecent.slice(-settings.recentKeep),
        };

        applyPersistedState(nextState);
        return {
          summaryUsage: normalizeTokenUsage(data?.usage),
        };
      } catch (error) {
        console.error("gpt memory summarize failed", error);

        const fallbackState: KinMemoryState = {
          memory: candidateMemory,
          recentMessages: trimmedRecent,
        };

        applyPersistedState(fallbackState);
        return { summaryUsage: null };
      }
    },
    [
      applyPersistedState,
      config.approvedMemoryRules,
      config.memoryInterpreterSettings,
      config.onAddPendingMemoryRuleCandidates,
      config.rejectedMemoryRuleCandidateSignatures,
      settings,
    ]
  );

  const resetGptForCurrentKin = useCallback(() => {
    applyPersistedState(getEmptyKinState());
  }, [applyPersistedState]);

  const clearTaskScopedMemory = useCallback(() => {
    const current = gptStateRef.current;
    const currentMemory = normalizeMemoryShape(current.memory);
    const currentLists =
      currentMemory.lists && typeof currentMemory.lists === "object"
        ? { ...currentMemory.lists }
        : {};

    delete currentLists.activeDocument;
    delete currentLists.worksByEntity;
    delete currentLists.trackedEntities;

    const nextState: KinMemoryState = {
      ...current,
      memory: {
        ...currentMemory,
        lists: currentLists,
        context: {
          ...currentMemory.context,
          currentTopic: undefined,
          currentTask: undefined,
          followUpRule: undefined,
          lastUserIntent: undefined,
        },
      },
    };

    applyPersistedState(nextState);
  }, [applyPersistedState]);

  const persistCurrentGptState = applyPersistedState;

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
    persistCurrentGptState,
    clearTaskScopedMemory,
    ensureKinState,
    removeKinState,
    chatRecentLimit: settings.chatRecentLimit,
    memorySettings: settings,
    updateMemorySettings,
    resetMemorySettings,
    defaultMemorySettings: DEFAULT_MEMORY_SETTINGS,
  };
}
