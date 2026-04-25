import { describe, expect, it } from "vitest";
import {
  clearTaskScopedMemory,
  createEmptyMemory,
  DISPLAYED_CONTEXT_MEMORY_LIST_KEYS,
  mergeMemory,
  normalizeMemorySettings,
  normalizeMemoryShape,
  safeParseMemory,
  STABLE_MEMORY_CONTEXT_KEYS,
  STABLE_MEMORY_LIST_KEYS,
  TASK_SCOPED_MEMORY_CONTEXT_KEYS,
  TASK_SCOPED_MEMORY_LIST_KEYS,
} from "@/lib/memory-domain/memory";

describe("memory helpers", () => {
  it("creates an empty memory shape", () => {
    expect(createEmptyMemory()).toEqual({
      facts: [],
      preferences: [],
      lists: {},
      context: {},
    });
  });

  it("normalizes memory shape safely", () => {
    expect(
      normalizeMemoryShape({
        facts: ["fact-1", 123, "fact-2"],
        preferences: ["pref-1", null],
        lists: ["bad"],
        context: {
          currentTopic: "Topic",
          currentTask: 123,
          followUpRule: "Rule",
          lastUserIntent: "Intent",
          extra: "value",
        },
      })
    ).toEqual({
      facts: ["fact-1", "fact-2"],
      preferences: ["pref-1"],
      lists: {},
      context: {
        currentTopic: "Topic",
        currentTask: undefined,
        followUpRule: "Rule",
        lastUserIntent: "Intent",
        extra: "value",
      },
    });
  });

  it("falls back to empty memory on invalid json", () => {
    expect(safeParseMemory("{bad-json")).toEqual(createEmptyMemory());
    expect(safeParseMemory(null)).toEqual(createEmptyMemory());
  });

  it("merges and deduplicates facts, preferences, lists, and context", () => {
    expect(
      mergeMemory(
        {
          facts: ["fact-1"],
          preferences: ["pref-1"],
          lists: { trackedEntities: ["Topic A"] },
          context: { currentTopic: "Topic A" },
        },
        {
          facts: ["fact-1", "fact-2"],
          preferences: ["pref-2"],
          lists: { activeDocument: { title: "Doc" } },
          context: { currentTask: "Task A" },
        }
      )
    ).toEqual({
      facts: ["fact-1", "fact-2"],
      preferences: ["pref-1", "pref-2"],
      lists: {
        trackedEntities: ["Topic A"],
        activeDocument: { title: "Doc" },
      },
      context: {
        currentTopic: undefined,
        currentTask: "Task A",
        followUpRule: undefined,
        lastUserIntent: undefined,
      },
    });
  });

  it("normalizes memory settings and clamps recentKeep to chatRecentLimit", () => {
    expect(
      normalizeMemorySettings({
        maxFacts: 0,
        maxPreferences: 2.8,
        chatRecentLimit: 3.9,
        summarizeThreshold: 1,
        recentKeep: 99,
      })
    ).toEqual({
      maxFacts: 1,
      maxPreferences: 2,
      chatRecentLimit: 3,
      summarizeThreshold: 3,
      recentKeep: 3,
    });
  });

  it("clears only task-scoped memory fields", () => {
    const next = clearTaskScopedMemory({
      facts: ["fact"],
      preferences: ["pref"],
      lists: {
        activeDocument: { title: "Doc A" },
        worksByEntity: { TopicA: ["Work A"] },
        trackedEntities: ["TopicA"],
        recentSearchQueries: ["query"],
      },
      context: {
        currentTopic: "TopicA",
        proposedTopic: "TopicB",
        currentTask: "TaskA",
        followUpRule: "RuleA",
        lastUserIntent: "IntentA",
      },
    });

    expect(next.facts).toEqual(["fact"]);
    expect(next.preferences).toEqual(["pref"]);
    expect(next.lists.recentSearchQueries).toEqual(["query"]);
    expect(next.lists.activeDocument).toBeUndefined();
    expect(next.lists.worksByEntity).toBeUndefined();
    expect(next.lists.trackedEntities).toBeUndefined();
    expect(next.context.currentTopic).toBeUndefined();
    expect(next.context.proposedTopic).toBe("TopicB");
    expect(next.context.currentTask).toBeUndefined();
    expect(next.context.followUpRule).toBeUndefined();
    expect(next.context.lastUserIntent).toBeUndefined();
  });

  it("declares lifecycle keys for task-scoped lists and context", () => {
    expect(TASK_SCOPED_MEMORY_LIST_KEYS).toEqual([
      "activeDocument",
      "worksByEntity",
      "trackedEntities",
    ]);
    expect(TASK_SCOPED_MEMORY_CONTEXT_KEYS).toEqual([
      "currentTopic",
      "currentTask",
      "followUpRule",
      "lastUserIntent",
    ]);
    expect(DISPLAYED_CONTEXT_MEMORY_LIST_KEYS).toEqual(["activeDocument"]);
    expect(STABLE_MEMORY_LIST_KEYS).toEqual(["recentSearchQueries"]);
    expect(STABLE_MEMORY_CONTEXT_KEYS).toEqual(["proposedTopic"]);
  });
});

