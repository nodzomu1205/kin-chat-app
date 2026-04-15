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
import { runGptMemoryUpdateCycle } from "@/lib/app/gptMemoryUpdateCoordinator";
import {
  clearTaskScopedMemoryState,
  ensureStoredKinMemoryState,
  loadStoredGptMemorySettings,
  loadStoredKinMemoryMap,
  normalizeUpdatedMemorySettings,
  persistStoredGptMemorySettings,
  persistStoredKinMemoryMap,
  removeStoredKinMemoryState,
  resolveActiveKinMemoryState,
  upsertStoredKinMemoryState,
} from "@/lib/app/gptMemoryStoreCoordinator";
import {
  runGptMemoryApprovedCandidateReapplyCycle,
  runGptMemoryApprovedRulesReapplyCycle,
  runGptMemoryRejectedCandidateReapplyCycle,
} from "@/lib/app/gptMemoryUpdateCoordinator";
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
  onAddPendingMemoryRuleCandidates: (
    candidates: PendingMemoryRuleCandidate[],
    approvedMemoryRulesOverride?: ApprovedMemoryRule[]
  ) => void;
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
    setSettings(loadStoredGptMemorySettings());
  }, []);

  useEffect(() => {
    persistStoredGptMemorySettings(settings);
  }, [settings]);

  useEffect(() => {
    const saved = loadStoredKinMemoryMap(settings);
    setKinMemoryMap(saved);
    kinMemoryMapRef.current = saved;
  }, [settings]);

  useEffect(() => {
    kinMemoryMapRef.current = kinMemoryMap;
    persistStoredKinMemoryMap(kinMemoryMap);
  }, [kinMemoryMap]);

  useEffect(() => {
    const nextState = resolveActiveKinMemoryState(
      currentKin,
      kinMemoryMapRef.current,
      settings
    );

    setGptState(nextState);
    gptStateRef.current = nextState;
  }, [currentKin, settings]);

  useEffect(() => {
    gptStateRef.current = gptState;
  }, [gptState]);

  const persistKinState = useCallback(
    (kin: string | null, state: KinMemoryState) => {
      setKinMemoryMap((prev) =>
        upsertStoredKinMemoryState({
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
    setKinMemoryMap((prev) => removeStoredKinMemoryState(prev, kin));
  }, []);

  const ensureKinState = useCallback(
    (kin: string | null) => {
      setKinMemoryMap((prev) =>
        ensureStoredKinMemoryState({
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

  const applyUpdateCycleResult = useCallback(
    (
      result: { nextState: KinMemoryState | null; summaryUsage: TokenUsage | null }
    ): { summaryUsage: TokenUsage | null } => {
      if (result.nextState) {
        applyPersistedState(result.nextState);
      }
      return { summaryUsage: result.summaryUsage };
    },
    [applyPersistedState]
  );

  const runMemoryUpdate = useCallback(
    async (
      updatedRecent: Message[],
      options: MemoryUpdateOptions | undefined,
      runtimeConfig?: {
        approvedMemoryRules?: ApprovedMemoryRule[];
        rejectedMemoryRuleCandidateSignatures?: string[];
        currentMemoryOverride?: Memory;
      }
    ): Promise<{ summaryUsage: TokenUsage | null }> => {
      const result = await runGptMemoryUpdateCycle({
        currentState: gptStateRef.current,
        updatedRecent,
        settings,
        options,
        memoryInterpreterSettings: config.memoryInterpreterSettings,
        approvedMemoryRules: config.approvedMemoryRules,
        rejectedMemoryRuleCandidateSignatures:
          config.rejectedMemoryRuleCandidateSignatures,
        approvedMemoryRulesOverride: runtimeConfig?.approvedMemoryRules,
        rejectedMemoryRuleCandidateSignaturesOverride:
          runtimeConfig?.rejectedMemoryRuleCandidateSignatures,
        currentMemoryOverride: runtimeConfig?.currentMemoryOverride,
        onAddPendingMemoryRuleCandidates: config.onAddPendingMemoryRuleCandidates,
      });
      return applyUpdateCycleResult(result);
    },
    [
      applyUpdateCycleResult,
      applyPersistedState,
      config.memoryInterpreterSettings,
      config.approvedMemoryRules,
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
      const result = await runGptMemoryApprovedRulesReapplyCycle({
        currentState: gptStateRef.current,
        settings,
        memoryInterpreterSettings: config.memoryInterpreterSettings,
        approvedMemoryRules: config.approvedMemoryRules,
        rejectedMemoryRuleCandidateSignatures:
          config.rejectedMemoryRuleCandidateSignatures,
        approvedMemoryRulesOverride: approvedMemoryRules,
        onAddPendingMemoryRuleCandidates: config.onAddPendingMemoryRuleCandidates,
      });
      return applyUpdateCycleResult(result);
    },
    [
      applyUpdateCycleResult,
      applyPersistedState,
      config.approvedMemoryRules,
      config.memoryInterpreterSettings,
      config.onAddPendingMemoryRuleCandidates,
      config.rejectedMemoryRuleCandidateSignatures,
      settings,
    ]
  );

  const reapplyCurrentMemoryWithApprovedCandidate = useCallback(
    async (
      candidate: PendingMemoryRuleCandidate,
      approvedMemoryRules: ApprovedMemoryRule[]
    ): Promise<{ summaryUsage: TokenUsage | null }> => {
      const result = await runGptMemoryApprovedCandidateReapplyCycle({
        currentState: gptStateRef.current,
        settings,
        memoryInterpreterSettings: config.memoryInterpreterSettings,
        approvedMemoryRules: config.approvedMemoryRules,
        rejectedMemoryRuleCandidateSignatures:
          config.rejectedMemoryRuleCandidateSignatures,
        candidate,
        approvedMemoryRulesOverride: approvedMemoryRules,
        onAddPendingMemoryRuleCandidates: config.onAddPendingMemoryRuleCandidates,
      });
      return applyUpdateCycleResult(result);
    },
    [
      applyUpdateCycleResult,
      applyPersistedState,
      config.approvedMemoryRules,
      config.memoryInterpreterSettings,
      config.onAddPendingMemoryRuleCandidates,
      config.rejectedMemoryRuleCandidateSignatures,
      settings,
    ]
  );

  const reapplyCurrentMemoryWithRejectedCandidate = useCallback(
    async (
      candidate: PendingMemoryRuleCandidate,
      rejectedMemoryRuleCandidateSignatures: string[]
    ): Promise<{ summaryUsage: TokenUsage | null }> => {
      const result = await runGptMemoryRejectedCandidateReapplyCycle({
        currentState: gptStateRef.current,
        settings,
        memoryInterpreterSettings: config.memoryInterpreterSettings,
        approvedMemoryRules: config.approvedMemoryRules,
        rejectedMemoryRuleCandidateSignatures:
          config.rejectedMemoryRuleCandidateSignatures,
        candidate,
        rejectedMemoryRuleCandidateSignaturesOverride:
          rejectedMemoryRuleCandidateSignatures,
        onAddPendingMemoryRuleCandidates: config.onAddPendingMemoryRuleCandidates,
      });
      return applyUpdateCycleResult(result);
    },
    [
      applyUpdateCycleResult,
      applyPersistedState,
      config.approvedMemoryRules,
      config.memoryInterpreterSettings,
      config.onAddPendingMemoryRuleCandidates,
      config.rejectedMemoryRuleCandidateSignatures,
      settings,
    ]
  );

  const resetGptForCurrentKin = useCallback(() => {
    applyPersistedState(createEmptyKinMemoryState());
  }, [applyPersistedState]);

  const clearTaskScopedMemory = useCallback(() => {
    applyPersistedState(clearTaskScopedMemoryState(gptStateRef.current));
  }, [applyPersistedState]);

  const persistCurrentGptState = applyPersistedState;

  const updateMemorySettings = useCallback((next: MemorySettings) => {
    setSettings(normalizeUpdatedMemorySettings(next));
  }, []);

  const resetMemorySettings = useCallback(() => {
    setSettings(DEFAULT_MEMORY_SETTINGS);
  }, []);

  return {
    gptState,
    setGptState,
    gptStateRef,
    handleGptMemory,
    resetGptForCurrentKin,
    reapplyCurrentMemoryWithApprovedRules,
    reapplyCurrentMemoryWithApprovedCandidate,
    reapplyCurrentMemoryWithRejectedCandidate,
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
