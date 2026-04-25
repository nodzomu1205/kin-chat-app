import { describe, expect, it } from "vitest";
import { buildResolvedTopicContextState } from "@/lib/app/memory-interpreter/memoryInterpreterContextReducer";
import { resolveTopicFromInputs } from "@/lib/app/memory-interpreter/memoryInterpreterTopicResolution";

describe("memoryInterpreterResolvedContext", () => {
  it("resolves topic from adjudication before input text and existing topic", () => {
    expect(
      resolveTopicFromInputs({
        inputText: "Tell me more about Chekhov",
        existingTopic: "Russian literature",
        topicAdjudication: {
          committedTopic: "Dostoevsky",
        },
      })
    ).toBe("Dostoevsky");
  });

  it("preserves the existing topic for short acknowledgements", () => {
    expect(
      resolveTopicFromInputs({
        inputText: "I see",
        existingTopic: "Japanese history",
      })
    ).toBe("Japanese history");
  });

  it("uses the latest input as lastUserIntent when no explicit override is provided", () => {
    const result = buildResolvedTopicContextState({
      currentContext: {
        currentTask: "Old task",
        followUpRule: "Old follow-up rule",
        lastUserIntent: "Previous intent",
      },
      resolvedTopic: "Chekhov",
      inputText: "Please explain more clearly",
    });

    expect(result.currentTopic).toBe("Chekhov");
    expect(result.currentTask).toContain("Chekhov");
    expect(result.followUpRule).toContain("Chekhov");
    expect(result.lastUserIntent).toBe("Please explain more clearly");
  });

  it("uses an explicit lastUserIntent override when provided", () => {
    expect(
      buildResolvedTopicContextState({
        currentContext: {
          currentTask: "Old task",
          followUpRule: "Old follow-up rule",
          lastUserIntent: "Previous intent",
        },
        resolvedTopic: "Chekhov",
        inputText: "Brand new input",
        lastUserIntentOverride: "Task-oriented clarification",
      }).lastUserIntent
    ).toBe("Task-oriented clarification");
  });

  it("keeps topic and updates currentTask when a task title override is provided", () => {
    const result = buildResolvedTopicContextState({
      currentContext: {
        currentTopic: "Modern Japanese literature",
        currentTask: "Old task",
        followUpRule: "Old follow-up rule",
        lastUserIntent: "Previous intent",
      },
      resolvedTopic: "Modern Japanese literature",
      currentTaskTitleOverride: "Organize notes about the era",
      inputText: "Please organize the era notes",
    });

    expect(result.currentTopic).toBe("Modern Japanese literature");
    expect(result.currentTask).toBe("Organize notes about the era");
  });
});
