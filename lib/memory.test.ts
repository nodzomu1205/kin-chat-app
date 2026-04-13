import { describe, expect, it } from "vitest";
import {
  createEmptyMemory,
  mergeMemory,
  normalizeMemorySettings,
  normalizeMemoryShape,
  safeParseMemory,
} from "@/lib/memory";

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
});
