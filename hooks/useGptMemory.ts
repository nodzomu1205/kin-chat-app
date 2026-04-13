"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createEmptyKinMemoryState } from "@/lib/app/gptMemoryCore";
import {
  type Memory,
  type MemorySettings,
  DEFAULT_MEMORY_SETTINGS,
} from "@/lib/memory";
import {
  type TokenUsage,
} from "@/lib/app/gptMemoryStateHelpers";
import { resolveSummarizedMemoryState } from "@/lib/app/gptMemoryUpdateFlow";
import { prepareMemoryUpdate } from "@/lib/app/gptMemoryUpdatePreparation";
import {
  buildProvisionalMemoryState,
  type ProvisionalMemoryOptions,
} from "@/lib/app/gptMemoryPersistence";
import {
  clearTaskScopedMemoryState,
  loadKinMemoryMapFromStorage,
  loadMemorySettingsFromStorage,
  resolveCurrentKinState,
  saveKinMemoryMapToStorage,
  saveMemorySettingsToStorage,
} from "@/lib/app/gptMemoryStorage";
import {
  ensureKinMemoryMapState,
  normalizeNextMemorySettings,
  removeKinMemoryMapState,
  upsertKinMemoryMapState,
} from "@/lib/app/gptMemoryRegistry";
import {
  getReapplicableRecentMessages,
  mergeApprovedRulesWithCandidate,
} from "@/lib/app/gptMemoryReapply";
import {
  resolveApprovedMemoryRules,
} from "@/lib/app/gptMemoryFallback";
import type {
  ApprovedMemoryRule,
  MemoryInterpreterSettings,
  PendingMemoryRuleCandidate,
} from "@/lib/memoryInterpreterRules";
import type { MemoryUpdateOptions } from "@/hooks/useChatPageActions";
import type { KinMemoryState, Message } from "@/types/chat";

export type { TokenUsage } from "@/lib/app/gptMemoryStateHelpers";

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
  const [gptState, setGptState] = useState<KinMemoryState>(createEmptyKinMemoryState());
  const gptStateRef = useRef<KinMemoryState>(createEmptyKinMemoryState());
  const [kinMemoryMap, setKinMemoryMap] = useState<Record<string, KinMemoryState>>({});
  const kinMemoryMapRef = useRef<Record<string, KinMemoryState>>({});

  useEffect(() => {
    const saved = loadMemorySettingsFromStorage();
    if (saved) {
      setSettings(saved);
    }
  }, []);

  useEffect(() => {
    saveMemorySettingsToStorage(settings);
  }, [settings]);

  useEffect(() => {
    const saved = loadKinMemoryMapFromStorage(settings);
    if (saved) {
      setKinMemoryMap(saved);
      kinMemoryMapRef.current = saved;
    }
  }, [settings]);

  useEffect(() => {
    kinMemoryMapRef.current = kinMemoryMap;
    saveKinMemoryMapToStorage(kinMemoryMap);
  }, [kinMemoryMap]);

  useEffect(() => {
    const nextState = resolveCurrentKinState(currentKin, kinMemoryMapRef.current, settings);

    setGptState(nextState);
    gptStateRef.current = nextState;
  }, [currentKin, settings]);

  useEffect(() => {
    gptStateRef.current = gptState;
  }, [gptState]);

  const persistKinState = useCallback(
    (kin: string | null, state: KinMemoryState) => {
      setKinMemoryMap((prev) =>
        upsertKinMemoryMapState({
          prev,
          kin,
          state,
          settings,
        })
      );
    },
    [settings]
  );

  const removeKinState = useCallback((kin: string) => {
    setKinMemoryMap((prev) => removeKinMemoryMapState(prev, kin));
  }, []);

  const ensureKinState = useCallback(
    (kin: string | null) => {
      setKinMemoryMap((prev) =>
        ensureKinMemoryMapState({
          prev,
          kin,
          settings,
        })
      );
    },
    [settings]
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
      return buildProvisionalMemoryState({
        inputText,
        currentMemory: gptStateRef.current.memory,
        settings,
        options,
      });
    },
    [settings]
  );

  const runMemoryUpdate = useCallback(
    async (
      updatedRecent: Message[],
      options: MemoryUpdateOptions | undefined,
      runtimeConfig?: {
        approvedMemoryRules?: ApprovedMemoryRule[];
      }
    ): Promise<{ summaryUsage: TokenUsage | null }> => {
      const current = gptStateRef.current;
      const activeApprovedRules = resolveApprovedMemoryRules(
        runtimeConfig?.approvedMemoryRules,
        config.approvedMemoryRules
      );
      const { trimmedRecent, candidateMemory, needsSummary, filteredPendingCandidates } =
        await prepareMemoryUpdate({
        currentMemory: current.memory,
        updatedRecent,
        settings,
        options,
        memoryInterpreterSettings: config.memoryInterpreterSettings,
        approvedRules: activeApprovedRules,
        rejectedMemoryRuleCandidateSignatures:
          config.rejectedMemoryRuleCandidateSignatures,
      });

      if (filteredPendingCandidates.length > 0) {
        config.onAddPendingMemoryRuleCandidates(filteredPendingCandidates);
      }

      if (!needsSummary) {
        const nextState: KinMemoryState = {
          memory: candidateMemory,
          recentMessages: trimmedRecent,
        };

        applyPersistedState(nextState);
        return { summaryUsage: null };
      }
      const result = await resolveSummarizedMemoryState({
        candidateMemory,
        trimmedRecent,
        settings,
      });
      applyPersistedState(result.nextState);
      return {
        summaryUsage: result.summaryUsage,
      };
    },
    [
      applyPersistedState,
      config.memoryInterpreterSettings,
      config.onAddPendingMemoryRuleCandidates,
      config.rejectedMemoryRuleCandidateSignatures,
      settings,
    ]
  );

  const handleGptMemory = useCallback(
    async (
      updatedRecent: Message[],
      options?: MemoryUpdateOptions
    ): Promise<{ summaryUsage: TokenUsage | null }> => {
      return runMemoryUpdate(updatedRecent, options);
    },
    [runMemoryUpdate]
  );

  const reapplyCurrentMemoryWithApprovedRules = useCallback(
    async (
      approvedMemoryRules: ApprovedMemoryRule[]
    ): Promise<{ summaryUsage: TokenUsage | null }> => {
      const current = gptStateRef.current;
      const recent = getReapplicableRecentMessages(current);
      if (recent.length === 0) {
        return { summaryUsage: null };
      }
      return runMemoryUpdate(recent, undefined, { approvedMemoryRules });
    },
    [runMemoryUpdate]
  );

  const reapplyCurrentMemoryWithApprovedCandidate = useCallback(
    async (
      candidate: PendingMemoryRuleCandidate,
      approvedMemoryRules: ApprovedMemoryRule[]
    ): Promise<{ summaryUsage: TokenUsage | null }> => {
      const current = gptStateRef.current;
      const recent = getReapplicableRecentMessages(current);
      if (recent.length === 0) {
        return { summaryUsage: null };
      }
      const mergedApprovedRules = mergeApprovedRulesWithCandidate(
        candidate,
        approvedMemoryRules
      );
      return runMemoryUpdate(recent, undefined, {
        approvedMemoryRules: mergedApprovedRules,
      });
    },
    [runMemoryUpdate]
  );

  const resetGptForCurrentKin = useCallback(() => {
    applyPersistedState(createEmptyKinMemoryState());
  }, [applyPersistedState]);

  const clearTaskScopedMemory = useCallback(() => {
    applyPersistedState(clearTaskScopedMemoryState(gptStateRef.current));
  }, [applyPersistedState]);

  const persistCurrentGptState = applyPersistedState;

  const updateMemorySettings = useCallback((next: MemorySettings) => {
    setSettings(normalizeNextMemorySettings(next));
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
    reapplyCurrentMemoryWithApprovedRules,
    reapplyCurrentMemoryWithApprovedCandidate,
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
