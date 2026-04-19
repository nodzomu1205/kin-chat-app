import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadMemoryRuleStoreState,
  normalizeMemoryInterpreterSettingsState,
  savePendingMemoryRuleCandidatesState,
} from "@/lib/app/memoryRuleStore";
import {
  MEMORY_INTERPRETER_SETTINGS_KEY,
  PENDING_MEMORY_RULE_CANDIDATES_KEY,
} from "@/lib/app/chatPageStorageKeys";

describe("memoryRuleStore", () => {
  const localStorageMock = (() => {
    let store = new Map<string, string>();
    return {
      getItem(key: string) {
        return store.has(key) ? store.get(key)! : null;
      },
      setItem(key: string, value: string) {
        store.set(key, value);
      },
      clear() {
        store = new Map();
      },
    };
  })();

  beforeEach(() => {
    vi.stubGlobal("window", {
      localStorage: localStorageMock,
    });
    localStorageMock.clear();
  });

  it("loads the normalized memory rule store state from localStorage", () => {
    window.localStorage.setItem(
      MEMORY_INTERPRETER_SETTINGS_KEY,
      JSON.stringify({ llmFallbackEnabled: false })
    );
    window.localStorage.setItem(
      PENDING_MEMORY_RULE_CANDIDATES_KEY,
      JSON.stringify([
        {
          id: "c1",
          kind: "topic_alias",
          phrase: "Move Planning",
          sourceText: "Move Planning",
          createdAt: "2026-04-19T00:00:00.000Z",
        },
      ])
    );

    const state = loadMemoryRuleStoreState();

    expect(state.memoryInterpreterSettings).toEqual({
      llmFallbackEnabled: false,
      saveRuleCandidates: true,
    });
    expect(state.pendingMemoryRuleCandidates).toHaveLength(1);
    expect(state.approvedMemoryRules).toEqual([]);
    expect(state.rejectedMemoryRuleCandidateSignatures).toEqual([]);
  });

  it("falls back safely on invalid stored values", () => {
    window.localStorage.setItem(MEMORY_INTERPRETER_SETTINGS_KEY, "{bad-json");

    const state = loadMemoryRuleStoreState();

    expect(state.memoryInterpreterSettings).toEqual({
      llmFallbackEnabled: true,
      saveRuleCandidates: true,
    });
    expect(state.pendingMemoryRuleCandidates).toEqual([]);
  });

  it("normalizes interpreter settings without widening the schema", () => {
    expect(
      normalizeMemoryInterpreterSettingsState({
        llmFallbackEnabled: false,
        saveRuleCandidates: "yes",
        extra: true,
      })
    ).toEqual({
      llmFallbackEnabled: false,
      saveRuleCandidates: true,
    });
  });

  it("saves pending candidates through the trimmed queue normalization", () => {
    const candidates = Array.from({ length: 55 }, (_, index) => ({
      id: `c${index}`,
      kind: "utterance_review" as const,
      phrase: `candidate-${index}`,
      sourceText: `source-${index}`,
      createdAt: `2026-04-19T00:00:${String(index).padStart(2, "0")}.000Z`,
    }));

    savePendingMemoryRuleCandidatesState(candidates);

    const saved = JSON.parse(
      window.localStorage.getItem(PENDING_MEMORY_RULE_CANDIDATES_KEY) || "[]"
    );
    expect(saved).toHaveLength(2);
    expect(saved[0].id).toBe("c53");
    expect(saved.at(-1).id).toBe("c54");
  });
});
