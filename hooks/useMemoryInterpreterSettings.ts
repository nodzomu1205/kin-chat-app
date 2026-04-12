"use client";

import { useEffect, useState } from "react";
import type {
  ApprovedMemoryRule,
  MemoryInterpreterSettings,
  PendingMemoryRuleCandidate,
} from "@/lib/memoryInterpreterRules";
import { DEFAULT_MEMORY_INTERPRETER_SETTINGS } from "@/lib/memoryInterpreterRules";
import {
  APPROVED_MEMORY_RULES_KEY,
  MEMORY_INTERPRETER_SETTINGS_KEY,
  PENDING_MEMORY_RULE_CANDIDATES_KEY,
  REJECTED_MEMORY_RULE_CANDIDATES_KEY,
} from "@/lib/app/chatPageStorageKeys";

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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedSettings = window.localStorage.getItem(MEMORY_INTERPRETER_SETTINGS_KEY);
    const savedPending = window.localStorage.getItem(PENDING_MEMORY_RULE_CANDIDATES_KEY);
    const savedApproved = window.localStorage.getItem(APPROVED_MEMORY_RULES_KEY);
    const savedRejected = window.localStorage.getItem(
      REJECTED_MEMORY_RULE_CANDIDATES_KEY
    );

    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings) as Partial<MemoryInterpreterSettings>;
        setMemoryInterpreterSettings({
          llmFallbackEnabled:
            typeof parsed.llmFallbackEnabled === "boolean"
              ? parsed.llmFallbackEnabled
              : DEFAULT_MEMORY_INTERPRETER_SETTINGS.llmFallbackEnabled,
          saveRuleCandidates:
            typeof parsed.saveRuleCandidates === "boolean"
              ? parsed.saveRuleCandidates
              : DEFAULT_MEMORY_INTERPRETER_SETTINGS.saveRuleCandidates,
        });
      } catch {}
    }

    if (savedPending) {
      try {
        const parsed = JSON.parse(savedPending) as PendingMemoryRuleCandidate[];
        if (Array.isArray(parsed)) setPendingMemoryRuleCandidates(parsed);
      } catch {}
    }

    if (savedApproved) {
      try {
        const parsed = JSON.parse(savedApproved) as ApprovedMemoryRule[];
        if (Array.isArray(parsed)) setApprovedMemoryRules(parsed);
      } catch {}
    }

    if (savedRejected) {
      try {
        const parsed = JSON.parse(savedRejected) as string[];
        if (Array.isArray(parsed)) setRejectedMemoryRuleCandidateSignatures(parsed);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      MEMORY_INTERPRETER_SETTINGS_KEY,
      JSON.stringify(memoryInterpreterSettings)
    );
  }, [memoryInterpreterSettings]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      PENDING_MEMORY_RULE_CANDIDATES_KEY,
      JSON.stringify(pendingMemoryRuleCandidates)
    );
  }, [pendingMemoryRuleCandidates]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      APPROVED_MEMORY_RULES_KEY,
      JSON.stringify(approvedMemoryRules)
    );
  }, [approvedMemoryRules]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      REJECTED_MEMORY_RULE_CANDIDATES_KEY,
      JSON.stringify(rejectedMemoryRuleCandidateSignatures)
    );
  }, [rejectedMemoryRuleCandidateSignatures]);

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
