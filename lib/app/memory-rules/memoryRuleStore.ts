import type {
  ApprovedMemoryRule,
  MemoryInterpreterSettings,
  PendingMemoryRuleCandidate,
} from "@/lib/memoryInterpreterRules";
import { DEFAULT_MEMORY_INTERPRETER_SETTINGS } from "@/lib/memoryInterpreterRules";
import { trimPendingMemoryRuleCandidates } from "@/lib/app/memory-rules/memoryRuleCandidateQueue";
import {
  APPROVED_MEMORY_RULES_KEY,
  MEMORY_INTERPRETER_SETTINGS_KEY,
  PENDING_MEMORY_RULE_CANDIDATES_KEY,
  REJECTED_MEMORY_RULE_CANDIDATES_KEY,
} from "@/lib/app/ui-state/chatPageStorageKeys";

export type MemoryRuleStoreState = {
  memoryInterpreterSettings: MemoryInterpreterSettings;
  pendingMemoryRuleCandidates: PendingMemoryRuleCandidate[];
  approvedMemoryRules: ApprovedMemoryRule[];
  rejectedMemoryRuleCandidateSignatures: string[];
};

export function normalizeMemoryInterpreterSettingsState(
  input: unknown
): MemoryInterpreterSettings {
  const parsed =
    input && typeof input === "object"
      ? (input as Partial<MemoryInterpreterSettings>)
      : {};

  return {
    llmFallbackEnabled:
      typeof parsed.llmFallbackEnabled === "boolean"
        ? parsed.llmFallbackEnabled
        : DEFAULT_MEMORY_INTERPRETER_SETTINGS.llmFallbackEnabled,
    saveRuleCandidates:
      typeof parsed.saveRuleCandidates === "boolean"
        ? parsed.saveRuleCandidates
        : DEFAULT_MEMORY_INTERPRETER_SETTINGS.saveRuleCandidates,
  };
}

export function normalizePendingMemoryRuleCandidatesState(input: unknown) {
  return Array.isArray(input)
    ? trimPendingMemoryRuleCandidates(input as PendingMemoryRuleCandidate[])
    : [];
}

export function normalizeApprovedMemoryRulesState(
  input: unknown
): ApprovedMemoryRule[] {
  return Array.isArray(input) ? (input as ApprovedMemoryRule[]) : [];
}

export function normalizeRejectedMemoryRuleCandidateSignaturesState(
  input: unknown
): string[] {
  return Array.isArray(input)
    ? input.filter((item): item is string => typeof item === "string")
    : [];
}

function createDefaultMemoryRuleStoreState(): MemoryRuleStoreState {
  return {
    memoryInterpreterSettings: DEFAULT_MEMORY_INTERPRETER_SETTINGS,
    pendingMemoryRuleCandidates: [],
    approvedMemoryRules: [],
    rejectedMemoryRuleCandidateSignatures: [],
  };
}

function safeParseStorageItem(key: string): unknown {
  if (typeof window === "undefined") return undefined;
  const value = window.localStorage.getItem(key);
  if (!value) return undefined;

  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

export function loadMemoryRuleStoreState(): MemoryRuleStoreState {
  const defaults = createDefaultMemoryRuleStoreState();

  if (typeof window === "undefined") {
    return defaults;
  }

  return {
    memoryInterpreterSettings: normalizeMemoryInterpreterSettingsState(
      safeParseStorageItem(MEMORY_INTERPRETER_SETTINGS_KEY)
    ),
    pendingMemoryRuleCandidates: normalizePendingMemoryRuleCandidatesState(
      safeParseStorageItem(PENDING_MEMORY_RULE_CANDIDATES_KEY)
    ),
    approvedMemoryRules: normalizeApprovedMemoryRulesState(
      safeParseStorageItem(APPROVED_MEMORY_RULES_KEY)
    ),
    rejectedMemoryRuleCandidateSignatures:
      normalizeRejectedMemoryRuleCandidateSignaturesState(
        safeParseStorageItem(REJECTED_MEMORY_RULE_CANDIDATES_KEY)
      ),
  };
}

export function saveMemoryInterpreterSettingsState(
  settings: MemoryInterpreterSettings
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    MEMORY_INTERPRETER_SETTINGS_KEY,
    JSON.stringify(normalizeMemoryInterpreterSettingsState(settings))
  );
}

export function savePendingMemoryRuleCandidatesState(
  candidates: PendingMemoryRuleCandidate[]
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    PENDING_MEMORY_RULE_CANDIDATES_KEY,
    JSON.stringify(normalizePendingMemoryRuleCandidatesState(candidates))
  );
}

export function saveApprovedMemoryRulesState(rules: ApprovedMemoryRule[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    APPROVED_MEMORY_RULES_KEY,
    JSON.stringify(normalizeApprovedMemoryRulesState(rules))
  );
}

export function saveRejectedMemoryRuleCandidateSignaturesState(
  signatures: string[]
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    REJECTED_MEMORY_RULE_CANDIDATES_KEY,
    JSON.stringify(normalizeRejectedMemoryRuleCandidateSignaturesState(signatures))
  );
}
