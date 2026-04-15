import { describe, expect, it } from "vitest";
import { resolveTopicFromInputs } from "@/lib/app/memoryInterpreterTopicResolution";

describe("memoryInterpreterTopicResolution", () => {
  it("prefers a committed topic from adjudication over other sources", () => {
    expect(
      resolveTopicFromInputs({
        inputText: "Please tell me about Chekhov",
        existingTopic: "Russian literature",
        topicAdjudication: {
          committedTopic: "Chekhov",
        },
      })
    ).toBe("Chekhov");
  });

  it("preserves the existing topic for short acknowledgements", () => {
    expect(
      resolveTopicFromInputs({
        inputText: "I see",
        existingTopic: "Japanese history",
      })
    ).toBe("Japanese history");
  });

  it("prefers a committed topic even when preserveExistingTopic is also present", () => {
    expect(
      resolveTopicFromInputs({
        inputText: "That was only a test",
        existingTopic: "Japanese history",
        topicAdjudication: {
          committedTopic: "Test topic",
          preserveExistingTopic: true,
          disableInputTopicInference: true,
        },
      })
    ).toBe("Test topic");
  });
});
