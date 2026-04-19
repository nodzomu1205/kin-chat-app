"use client";

import { useEffect, useState } from "react";
import type {
  ApprovedMemoryRule,
  MemoryInterpreterSettings,
  PendingMemoryRuleCandidate,
} from "@/lib/memoryInterpreterRules";
import { DEFAULT_MEMORY_INTERPRETER_SETTINGS } from "@/lib/memoryInterpreterRules";
import {
  loadMemoryRuleStoreState,
  saveApprovedMemoryRulesState,
  saveMemoryInterpreterSettingsState,
  savePendingMemoryRuleCandidatesState,
  saveRejectedMemoryRuleCandidateSignaturesState,
} from "@/lib/app/memoryRuleStore";

export function useMemoryInterpreterSettings() {
  const [memoryInterpreterSettings, setMemoryInterpreterSettings] =
    useState<MemoryInterpreterSettings>(DEFAULT_MEMORY_INTERPRETER_SETTINGS);
  const [pendingMemoryRuleCandidates, setPendingMemoryRuleCandidates] = useState<
    PendingMemoryRuleCandidate[]
  >([]);
  const [approvedMemoryRules, setApprovedMemoryRules] = useState<
    ApprovedMemoryRule[]
  >([]);
  const [rejectedMemoryRuleCandidateSignatures, setRejectedMemoryRuleCandidateSignatures] =
    useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const initialState = loadMemoryRuleStoreState();
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setMemoryInterpreterSettings(initialState.memoryInterpreterSettings);
      setPendingMemoryRuleCandidates(initialState.pendingMemoryRuleCandidates);
      setApprovedMemoryRules(initialState.approvedMemoryRules);
      setRejectedMemoryRuleCandidateSignatures(
        initialState.rejectedMemoryRuleCandidateSignatures
      );
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveMemoryInterpreterSettingsState(memoryInterpreterSettings);
  }, [hydrated, memoryInterpreterSettings]);

  useEffect(() => {
    if (!hydrated) return;
    savePendingMemoryRuleCandidatesState(pendingMemoryRuleCandidates);
  }, [hydrated, pendingMemoryRuleCandidates]);

  useEffect(() => {
    if (!hydrated) return;
    saveApprovedMemoryRulesState(approvedMemoryRules);
  }, [approvedMemoryRules, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveRejectedMemoryRuleCandidateSignaturesState(
      rejectedMemoryRuleCandidateSignatures
    );
  }, [hydrated, rejectedMemoryRuleCandidateSignatures]);

  return {
    memoryInterpreterSettings,
    setMemoryInterpreterSettings,
    pendingMemoryRuleCandidates,
    setPendingMemoryRuleCandidates,
    approvedMemoryRules,
    setApprovedMemoryRules,
    rejectedMemoryRuleCandidateSignatures,
    setRejectedMemoryRuleCandidateSignatures,
  };
}
