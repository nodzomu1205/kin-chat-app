import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildCandidateMemoryState,
  hasMeaningfulMemoryState,
  mergeSummarizedMemoryState,
  normalizeRecentMessagesState,
  normalizeTokenUsage,
  trimMemoryState,
} from "@/lib/app/gptMemoryStateHelpers";
import { DEFAULT_MEMORY_SETTINGS, type Memory } from "@/lib/memory";
import type { Message } from "@/types/chat";

const interpretMemoryPatchMock = vi.fn();

vi.mock("@/lib/app/memoryInterpreter", () => ({
  interpretMemoryPatch: (...args: unknown[]) => interpretMemoryPatchMock(...args),
}));

function buildMessage(
  id: string,
  role: Message["role"],
  text: string
): Message {
  return { id, role, text };
}

function buildMemory(overrides?: Partial<Memory>): Memory {
  return {
    facts: [],
    preferences: [],
    lists: {},
    context: {},
    ...overrides,
  };
}

describe("gptMemoryStateHelpers", () => {
  beforeEach(() => {
    interpretMemoryPatchMock.mockReset();
  });

  it("trims and normalizes memory state", () => {
    const trimmed = trimMemoryState(
      buildMemory({
        facts: [" fact-1 ", "fact-1", "fact-2", "fact-3"],
        preferences: [" pref-1 ", "pref-1", "pref-2"],
        lists: {
          trackedEntities: [" Topic A ", "Topic A", "Topic B"],
          recentSearchQueries: [" q1 ", "q2", "q3", "q4", "q5", "q6", "q7"],
          worksByEntity: {
            " Topic A ": [" work-1 ", "work-1", "work-2"],
          },
        },
        context: {
          currentTopic: " Topic A ",
          currentTask: " Task A ",
          followUpRule: " Rule A ",
          lastUserIntent: " Intent A ",
        },
      }),
      {
        ...DEFAULT_MEMORY_SETTINGS,
        maxFacts: 2,
        maxPreferences: 2,
      }
    );

    expect(trimmed).toEqual({
      facts: ["fact-2", "fact-3"],
      preferences: ["pref-1", "pref-2"],
      lists: {
        trackedEntities: ["Topic A", "Topic B"],
        recentSearchQueries: ["q2", "q3", "q4", "q5", "q6", "q7"],
        worksByEntity: {
          "Topic A": ["work-1", "work-2"],
        },
      },
      context: {
        currentTopic: "Topic A",
        currentTask: "Task A",
        followUpRule: "Rule A",
        lastUserIntent: "Intent A",
      },
    });
  });

  it("detects meaningful memory state", () => {
    expect(hasMeaningfulMemoryState(buildMemory())).toBe(false);
    expect(
      hasMeaningfulMemoryState(buildMemory({ context: { currentTopic: "Topic A" } }))
    ).toBe(true);
  });

  it("normalizes token usage safely", () => {
    expect(normalizeTokenUsage(null)).toBeNull();
    expect(
      normalizeTokenUsage({
        inputTokens: 10,
        outputTokens: 5,
      })
    ).toEqual({
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
    });
  });

  it("normalizes recent messages and enforces shape and limit", () => {
    expect(
      normalizeRecentMessagesState(
        [
          buildMessage("m1", "user", "first"),
          { id: "bad", role: "user" },
          buildMessage("m2", "gpt", "second"),
          buildMessage("m3", "user", "third"),
        ],
        2
      )
    ).toEqual([
      buildMessage("m2", "gpt", "second"),
      buildMessage("m3", "user", "third"),
    ]);
  });

  it("clears previous facts when the topic switches", () => {
    interpretMemoryPatchMock.mockReturnValue({
      facts: ["new fact"],
      lists: { trackedEntities: ["New Topic"] },
      context: {
        currentTopic: "New Topic",
      },
    });

    const result = buildCandidateMemoryState({
      currentMemory: buildMemory({
        facts: ["old fact"],
        lists: {
          activeDocument: { title: "Doc A" },
          recentSearchQueries: ["old search"],
          trackedEntities: ["Old Topic"],
        },
        context: {
          currentTopic: "Old Topic",
          currentTask: "Old Task",
        },
      }),
      updatedRecent: [
        buildMessage("m1", "user", "Switch to new topic"),
        buildMessage("m2", "gpt", "Sure"),
      ],
      settings: DEFAULT_MEMORY_SETTINGS,
      options: {
        previousCommittedTopic: "Old Topic",
      },
    });

    expect(result.topicSwitched).toBe(true);
    expect(result.previousTopic).toBe("Old Topic");
    expect(result.nextTopic).toBe("New Topic");
    expect(result.candidateMemory.facts).toEqual(["new fact"]);
    expect(result.candidateMemory.lists).toEqual({
      activeDocument: { title: "Doc A" },
      recentSearchQueries: ["old search"],
      trackedEntities: ["New Topic"],
    });
    expect(result.candidateMemory.context.lastUserIntent).toBe(
      "Switch to new topic"
    );
  });

  it("retains previous facts when no topic switch and no new facts are produced", () => {
    interpretMemoryPatchMock.mockReturnValue({
      context: {
        currentTopic: "Same Topic",
      },
    });

    const result = buildCandidateMemoryState({
      currentMemory: buildMemory({
        facts: ["old fact"],
        context: {
          currentTopic: "Same Topic",
        },
      }),
      updatedRecent: [
        buildMessage("m1", "user", "Continue the same topic"),
        buildMessage("m2", "gpt", "Okay"),
      ],
      settings: DEFAULT_MEMORY_SETTINGS,
      options: {
        previousCommittedTopic: "Same Topic",
      },
    });

    expect(result.topicSwitched).toBe(false);
    expect(result.candidateMemory.facts).toEqual(["old fact"]);
    expect(result.candidateMemory.context.lastUserIntent).toBe(
      "Continue the same topic"
    );
  });

  it("preserves candidate context when merging summarized memory", () => {
    const merged = mergeSummarizedMemoryState({
      candidateMemory: buildMemory({
        facts: ["candidate fact"],
        context: {
          currentTopic: "Move Preparation",
          currentTask: "Find a new home",
          followUpRule: "Carry the move topic",
          lastUserIntent: "",
        },
      }),
      summarizedCandidate: buildMemory({
        facts: ["summary fact"],
        context: {
          currentTopic: "Wrong Topic",
          currentTask: "Wrong Task",
          followUpRule: "Wrong Rule",
          lastUserIntent: "Wrong Intent",
        },
      }),
      settings: DEFAULT_MEMORY_SETTINGS,
      recentMessages: [],
    });

    expect(merged.context).toEqual({
      currentTopic: "Move Preparation",
      currentTask: "Find a new home",
      followUpRule: "Carry the move topic",
      lastUserIntent: "",
    });
    expect(merged.facts).toEqual(["candidate fact", "summary fact"]);
  });
});
