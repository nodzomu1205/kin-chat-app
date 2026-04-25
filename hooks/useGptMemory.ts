"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createEmptyKinMemoryState } from "@/lib/app/gpt-memory/gptMemoryCore";
import {
  type Memory,
  type MemorySettings,
  DEFAULT_MEMORY_SETTINGS,
} from "@/lib/memory";
import {
  type TokenUsage,
} from "@/lib/app/gpt-memory/gptMemoryStateHelpers";
import {
  clearTaskScopedMemoryState,
  ensureStoredKinMemoryState,
  normalizeUpdatedMemorySettings,
  persistStoredGptMemorySettings,
  persistStoredKinMemoryMap,
  removeStoredKinMemoryState,
  resolveActiveKinMemoryState,
  upsertStoredKinMemoryState,
} from "@/lib/app/gpt-memory/gptMemoryStoreCoordinator";
import {
  loadInitialGptMemoryRuntimeState,
  runGptMemoryRuntimeApprovedCandidateReapply,
  runGptMemoryRuntimeApprovedRulesReapply,
  runGptMemoryRuntimeRejectedCandidateReapply,
  runGptMemoryRuntimeUpdate,
  type GptMemoryRuntimeConfig,
} from "@/lib/app/gpt-memory/gptMemoryRuntime";
import type { ApprovedMemoryRule, PendingMemoryRuleCandidate } from "@/lib/memoryInterpreterRules";
import type { MemoryUpdateOptions } from "@/hooks/chatPageActionTypes";
import type { KinMemoryState, Message } from "@/types/chat";

export type { TokenUsage } from "@/lib/app/gpt-memory/gptMemoryStateHelpers";

export function useGptMemory(
  currentKin: string | null,
  config: GptMemoryRuntimeConfig
) {
  const [initialState] = useState(() => loadInitialGptMemoryRuntimeState(currentKin));
  const [settings, setSettings] = useState<MemorySettings>(initialState.settings);
  const [gptState, setGptState] = useState<KinMemoryState>(initialState.gptState);
  const gptStateRef = useRef<KinMemoryState>(initialState.gptState);
  const [kinMemoryMap, setKinMemoryMap] = useState<Record<string, KinMemoryState>>(
    initialState.kinMemoryMap
  );
  const kinMemoryMapRef = useRef<Record<string, KinMemoryState>>(
    initialState.kinMemoryMap
  );

  useEffect(() => {
    persistStoredGptMemorySettings(settings);
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
      result: {
        nextState: KinMemoryState | null;
        compressionUsage: TokenUsage | null;
        fallbackUsage: TokenUsage | null;
        fallbackUsageDetails: Record<string, unknown> | null;
        fallbackMetrics: {
          promptChars: number;
          rawReplyChars: number;
        } | null;
        fallbackDebug: {
          prompt: string;
          rawReply: string;
          parsed: unknown;
          usageDetails?: Record<string, unknown> | null;
        } | null;
      }
    ): {
      compressionUsage: TokenUsage | null;
      fallbackUsage: TokenUsage | null;
      fallbackUsageDetails: Record<string, unknown> | null;
      fallbackMetrics: {
        promptChars: number;
        rawReplyChars: number;
      } | null;
      fallbackDebug: {
        prompt: string;
        rawReply: string;
        parsed: unknown;
        usageDetails?: Record<string, unknown> | null;
      } | null;
    } => {
      if (result.nextState) {
        applyPersistedState(result.nextState);
      }
      return {
        compressionUsage: result.compressionUsage,
        fallbackUsage: result.fallbackUsage,
        fallbackUsageDetails: result.fallbackUsageDetails,
        fallbackMetrics: result.fallbackMetrics,
        fallbackDebug: result.fallbackDebug,
      };
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
    ): Promise<{
      compressionUsage: TokenUsage | null;
      fallbackUsage: TokenUsage | null;
      fallbackUsageDetails: Record<string, unknown> | null;
      fallbackMetrics: {
        promptChars: number;
        rawReplyChars: number;
      } | null;
      fallbackDebug: {
        prompt: string;
        rawReply: string;
        parsed: unknown;
        usageDetails?: Record<string, unknown> | null;
      } | null;
    }> => {
      const result = await runGptMemoryRuntimeUpdate({
        currentState: gptStateRef.current,
        updatedRecent,
        settings,
        options,
        config,
        runtimeConfig,
      });
      return applyUpdateCycleResult(result);
    },
    [applyUpdateCycleResult, config, settings]
  );

  const handleGptMemory = useCallback(
    async (
      updatedRecent: Message[],
      options?: MemoryUpdateOptions
    ): Promise<{
      compressionUsage: TokenUsage | null;
      fallbackUsage: TokenUsage | null;
      fallbackUsageDetails: Record<string, unknown> | null;
      fallbackMetrics: {
        promptChars: number;
        rawReplyChars: number;
      } | null;
      fallbackDebug: {
        prompt: string;
        rawReply: string;
        parsed: unknown;
        usageDetails?: Record<string, unknown> | null;
      } | null;
    }> => {
      return runMemoryUpdate(updatedRecent, options);
    },
    [runMemoryUpdate]
  );

  const reapplyCurrentMemoryWithApprovedRules = useCallback(
    async (
      approvedMemoryRules: ApprovedMemoryRule[]
    ): Promise<{
      compressionUsage: TokenUsage | null;
      fallbackUsage: TokenUsage | null;
      fallbackUsageDetails: Record<string, unknown> | null;
      fallbackMetrics: {
        promptChars: number;
        rawReplyChars: number;
      } | null;
      fallbackDebug: {
        prompt: string;
        rawReply: string;
        parsed: unknown;
        usageDetails?: Record<string, unknown> | null;
      } | null;
    }> => {
      const result = await runGptMemoryRuntimeApprovedRulesReapply({
        currentState: gptStateRef.current,
        settings,
        config,
        approvedMemoryRulesOverride: approvedMemoryRules,
      });
      return applyUpdateCycleResult(result);
    },
    [applyUpdateCycleResult, config, settings]
  );

  const reapplyCurrentMemoryWithApprovedCandidate = useCallback(
    async (
      candidate: PendingMemoryRuleCandidate,
      approvedMemoryRules: ApprovedMemoryRule[]
    ): Promise<{
      compressionUsage: TokenUsage | null;
      fallbackUsage: TokenUsage | null;
      fallbackUsageDetails: Record<string, unknown> | null;
      fallbackMetrics: {
        promptChars: number;
        rawReplyChars: number;
      } | null;
      fallbackDebug: {
        prompt: string;
        rawReply: string;
        parsed: unknown;
        usageDetails?: Record<string, unknown> | null;
      } | null;
    }> => {
      const result = await runGptMemoryRuntimeApprovedCandidateReapply({
        currentState: gptStateRef.current,
        settings,
        config,
        candidate,
        approvedMemoryRulesOverride: approvedMemoryRules,
      });
      return applyUpdateCycleResult(result);
    },
    [applyUpdateCycleResult, config, settings]
  );

  const reapplyCurrentMemoryWithRejectedCandidate = useCallback(
    async (
      candidate: PendingMemoryRuleCandidate,
      rejectedMemoryRuleCandidateSignatures: string[]
    ): Promise<{
      compressionUsage: TokenUsage | null;
      fallbackUsage: TokenUsage | null;
      fallbackUsageDetails: Record<string, unknown> | null;
      fallbackMetrics: {
        promptChars: number;
        rawReplyChars: number;
      } | null;
      fallbackDebug: {
        prompt: string;
        rawReply: string;
        parsed: unknown;
        usageDetails?: Record<string, unknown> | null;
      } | null;
    }> => {
      const result = await runGptMemoryRuntimeRejectedCandidateReapply({
        currentState: gptStateRef.current,
        settings,
        config,
        candidate,
        rejectedMemoryRuleCandidateSignaturesOverride:
          rejectedMemoryRuleCandidateSignatures,
      });
      return applyUpdateCycleResult(result);
    },
    [applyUpdateCycleResult, config, settings]
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

