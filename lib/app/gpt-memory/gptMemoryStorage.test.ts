import { describe, expect, it } from "vitest";
import { DEFAULT_MEMORY_SETTINGS } from "@/lib/memory";
import {
  clearTaskScopedMemoryState,
  resolveCurrentKinState,
} from "@/lib/app/gpt-memory/gptMemoryStorage";

describe("gptMemoryStorage", () => {
  it("resolves the current kin state from the map", () => {
    const state = resolveCurrentKinState(
      "kin-1",
      {
        "kin-1": {
          memory: {
            facts: [],
            preferences: [],
            lists: {},
            context: {
              currentTopic: "Topic A",
            },
          },
          recentMessages: [],
        },
      },
      DEFAULT_MEMORY_SETTINGS
    );

    expect(state.memory.context.currentTopic).toBe("Topic A");
  });

  it("clears task-scoped memory fields only", () => {
    const next = clearTaskScopedMemoryState({
      memory: {
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
          currentTask: "TaskA",
          followUpRule: "RuleA",
          lastUserIntent: "IntentA",
        },
      },
      recentMessages: [{ id: "m1", role: "user", text: "hello" }],
    });

    expect(next.memory.facts).toEqual(["fact"]);
    expect(next.memory.preferences).toEqual(["pref"]);
    expect(next.memory.lists.recentSearchQueries).toEqual(["query"]);
    expect(next.memory.lists.activeDocument).toBeUndefined();
    expect(next.memory.lists.worksByEntity).toBeUndefined();
    expect(next.memory.lists.trackedEntities).toBeUndefined();
    expect(next.memory.context.currentTopic).toBeUndefined();
    expect(next.memory.context.currentTask).toBeUndefined();
    expect(next.memory.context.followUpRule).toBeUndefined();
    expect(next.memory.context.lastUserIntent).toBeUndefined();
    expect(next.recentMessages).toEqual([{ id: "m1", role: "user", text: "hello" }]);
  });
});
