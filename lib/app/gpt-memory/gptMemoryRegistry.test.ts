import { describe, expect, it } from "vitest";
import { DEFAULT_MEMORY_SETTINGS } from "@/lib/memory-domain/memory";
import {
  ensureKinMemoryMapState,
  normalizeNextMemorySettings,
  removeKinMemoryMapState,
  upsertKinMemoryMapState,
} from "@/lib/app/gpt-memory/gptMemoryRegistry";

describe("gptMemoryRegistry", () => {
  it("upserts a normalized kin memory state", () => {
    const next = upsertKinMemoryMapState({
      prev: {},
      kin: "kin-1",
      state: {
        memory: {
          facts: [],
          preferences: [],
          lists: {},
          context: {
            currentTopic: " Topic A ",
          },
        },
        recentMessages: [],
      },
      settings: DEFAULT_MEMORY_SETTINGS,
    });

    expect(next["kin-1"].memory.context.currentTopic).toBe("Topic A");
  });

  it("removes a kin memory state entry", () => {
    const next = removeKinMemoryMapState(
      {
        "kin-1": {
          memory: { facts: [], preferences: [], lists: {}, context: {} },
          recentMessages: [],
        },
      },
      "kin-1"
    );

    expect(next).toEqual({});
  });

  it("ensures a kin memory state when missing", () => {
    const next = ensureKinMemoryMapState({
      prev: {},
      kin: "kin-1",
      settings: DEFAULT_MEMORY_SETTINGS,
    });

    expect(next["kin-1"]).toBeTruthy();
  });

  it("normalizes updated memory settings", () => {
    expect(
      normalizeNextMemorySettings({
        ...DEFAULT_MEMORY_SETTINGS,
        chatRecentLimit: 1.9,
      }).chatRecentLimit
    ).toBe(2);
  });
});
