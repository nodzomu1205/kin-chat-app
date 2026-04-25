import { describe, expect, it } from "vitest";
import { DEFAULT_MEMORY_SETTINGS } from "@/lib/memory-domain/memory";
import { normalizeKinMemoryStateForSettings } from "@/lib/app/gpt-memory/gptMemoryPersistence";

describe("gptMemoryPersistence", () => {
  it("normalizes persisted kin memory state for the active settings", () => {
    const normalized = normalizeKinMemoryStateForSettings(
      {
        memory: {
          facts: [" fact-1 ", "fact-1", "fact-2"],
          preferences: [],
          lists: {
            trackedEntities: [" Topic A ", "Topic A"],
          },
          context: {
            currentTopic: " Topic A ",
          },
        },
        recentMessages: [
          { id: "m1", role: "user", text: "first" },
          { id: "m2", role: "gpt", text: "second" },
          { id: "m3", role: "user", text: "third" },
        ],
      },
      {
        ...DEFAULT_MEMORY_SETTINGS,
        maxFacts: 2,
        chatRecentLimit: 2,
      }
    );

    expect(normalized).toEqual({
      memory: {
        facts: ["fact-1", "fact-2"],
        preferences: [],
        lists: {
          trackedEntities: ["Topic A"],
        },
        context: {
          currentTopic: "Topic A",
          currentTask: undefined,
          proposedTopic: undefined,
          followUpRule: undefined,
          lastUserIntent: undefined,
        },
      },
      recentMessages: [
        { id: "m2", role: "gpt", text: "second" },
        { id: "m3", role: "user", text: "third" },
      ],
    });
  });
});
