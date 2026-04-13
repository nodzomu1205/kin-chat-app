import { describe, expect, it, vi } from "vitest";
import { DEFAULT_MEMORY_SETTINGS } from "@/lib/memory";
import {
  buildProvisionalMemoryState,
  normalizeKinMemoryStateForSettings,
} from "@/lib/app/gptMemoryPersistence";

const interpretProvisionalMemoryContextMock = vi.fn();

vi.mock("@/lib/app/memoryInterpreter", () => ({
  interpretProvisionalMemoryContext: (...args: unknown[]) =>
    interpretProvisionalMemoryContextMock(...args),
}));

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

  it("builds provisional memory from interpreted context and trims it", () => {
    interpretProvisionalMemoryContextMock.mockReturnValue({
      currentTopic: " Move Planning ",
      currentTask: " Find a new home ",
    });

    const provisional = buildProvisionalMemoryState({
      inputText: "We need to move soon",
      currentMemory: {
        facts: [],
        preferences: [],
        lists: {},
        context: {},
      },
      settings: DEFAULT_MEMORY_SETTINGS,
      options: {
        currentTaskTitle: "Relocation",
      },
    });

    expect(provisional).toEqual({
      facts: [],
      preferences: [],
      lists: {},
      context: {
        currentTopic: "Move Planning",
        currentTask: "Find a new home",
        followUpRule: undefined,
        lastUserIntent: undefined,
      },
    });
  });
});
