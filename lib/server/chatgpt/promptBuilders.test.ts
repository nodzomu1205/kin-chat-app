import { describe, expect, it } from "vitest";
import { createEmptyMemory } from "@/lib/memory";
import {
  buildBaseSystemPrompt,
  buildInstructionWrappedInput,
  buildSearchSystemPrompt,
} from "@/lib/server/chatgpt/promptBuilders";

describe("promptBuilders", () => {
  it("wraps translate_explain input with translation instructions", () => {
    const result = buildInstructionWrappedInput(
      "Hello there",
      "translate_explain"
    );

    expect(result).toContain("Translate the following message into natural Japanese");
    expect(result).toContain("Source message:");
    expect(result).toContain("Hello there");
  });

  it("wraps reply_only input with reply-only instructions", () => {
    const result = buildInstructionWrappedInput("Thanks!", "reply_only");

    expect(result).toContain("Output only the reply text.");
    expect(result).toContain("Message:");
  });

  it("splits polish input into draft and revision request", () => {
    const result = buildInstructionWrappedInput(
      "Draft text\n---\nMake it warmer",
      "polish"
    );

    expect(result).toContain("Draft:\nDraft text");
    expect(result).toContain("Revision request:\nMake it warmer");
  });

  it("returns raw input for normal instruction mode", () => {
    expect(buildInstructionWrappedInput("plain text", "normal")).toBe(
      "plain text"
    );
  });

  it("builds strict base system prompt with long-term memory", () => {
    const memory = createEmptyMemory();
    memory.context.currentTopic = "Tokyo move";
    const result = buildBaseSystemPrompt({
      normalizedMemory: memory,
      reasoningMode: "strict",
    });

    expect(result).toContain("You are a strict factual assistant.");
    expect(result).toContain("LONG-TERM MEMORY (JSON)");
    expect(result).toContain("Tokyo move");
  });

  it("builds creative search system prompt using search evidence", () => {
    const result = buildSearchSystemPrompt(
      "best schools in tokyo",
      "School A\nSchool B",
      "creative"
    );

    expect(result).toContain("The user requested lookup with this query:");
    expect(result).toContain("best schools in tokyo");
    expect(result).toContain("SEARCH EVIDENCE START");
    expect(result).toContain("School A");
  });
});
