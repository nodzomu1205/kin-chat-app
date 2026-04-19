import { describe, expect, it } from "vitest";
import {
  applyApprovedMemoryRule,
  buildMemoryFallbackPrompt,
  shouldUseMemoryFallback,
  tryParseMemoryFallbackJson,
} from "@/lib/app/memoryInterpreterFallbackHelpers";

describe("memoryInterpreterFallbackHelpers", () => {
  it("applies approved topic alias rules", () => {
    expect(
      applyApprovedMemoryRule("yes move planning", [
        {
          id: "rule-1",
          phrase: "move planning",
          kind: "topic_alias",
          normalizedValue: "Move Planning",
          createdAt: "2026-04-13T00:00:00.000Z",
        },
      ])
    ).toEqual(
      expect.objectContaining({
        disableInputTopicInference: true,
        committedTopic: "Move Planning",
        trackedEntityOverride: "Move Planning",
      })
    );
  });

  it("applies approved utterance review keep rules on strong exact pattern matches", () => {
    expect(
      applyApprovedMemoryRule("that does not sound right", [
        {
          id: "rule-2",
          phrase: "that does not sound right",
          kind: "utterance_review",
          normalizedValue: "Socrates",
          topicDecision: "keep",
          surfacePattern: "that does not sound right",
          approvedCount: 3,
          createdAt: "2026-04-14T00:00:00.000Z",
        },
      ])
    ).toEqual(
      expect.objectContaining({
        disableInputTopicInference: true,
        committedTopic: "Socrates",
        trackedEntityOverride: "Socrates",
      })
    );
  });

  it("treats approved closing replies as keep-only shortcuts", () => {
    expect(
      applyApprovedMemoryRule("Thanks, that's enough", [
        {
          id: "rule-3",
          phrase: "Thanks, that's enough",
          kind: "closing_reply",
          createdAt: "2026-04-13T00:00:00.000Z",
        },
      ])
    ).toEqual(
      expect.objectContaining({
        disableInputTopicInference: true,
        preserveExistingTopic: true,
      })
    );
  });

  it("detects when fallback should run", () => {
    expect(shouldUseMemoryFallback("tell me more about socrates")).toBe(true);
    expect(shouldUseMemoryFallback("search: tokyo weather")).toBe(false);
  });

  it("parses json embedded in surrounding text", () => {
    expect(
      tryParseMemoryFallbackJson('prefix {"topic":"Tokyo","isClosingReply":false} suffix')
    ).toEqual({
      topic: "Tokyo",
      isClosingReply: false,
    });
  });

  it("builds a memory fallback prompt with current and task context", () => {
    const prompt = buildMemoryFallbackPrompt({
      latestUserText: "tell me more about socrates",
      currentTopic: "Greek philosophy",
      currentTask: "organize philosophy notes",
      lastUserIntent: "expand the current topic",
      priorMeaningfulText: "please organize the notes first",
      earlierMeaningfulText: "tell me about greek philosophy",
    });

    expect(prompt).toContain("TOPIC: Greek philosophy");
    expect(prompt).toContain("TASK: organize philosophy notes");
    expect(prompt).toContain("LAST_INTENT: expand the current topic");
    expect(prompt).toContain("PRIOR: please organize the notes first");
    expect(prompt).toContain("EARLIER: tell me about greek philosophy");
    expect(prompt).toContain("Return JSON only.");
    expect(prompt).toContain(
      "Write topic labels in the same language used in the chat."
    );
    expect(prompt).toContain(
      'Always return non-null strings for "proposedTopic".'
    );
    expect(prompt).not.toContain('"confidence": number');
    expect(prompt).toContain('"proposedTopic": string');
    expect(prompt).toContain('"topic": string');
    expect(prompt).not.toContain('"trackedEntity": string | null');
    expect(prompt).not.toContain('"evidenceText": string | null');
    expect(prompt).toContain("USER:");
  });
});
