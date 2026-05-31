import { describe, expect, it } from "vitest";
import { createEmptyMemory } from "@/lib/memory-domain/memory";
import {
  buildBaseSystemPrompt,
  buildInstructionWrappedInput,
  buildReplyDraftFollowupInput,
  buildSearchSystemPrompt,
} from "@/lib/server/chatgpt/promptBuilders";
import {
  extractReplyDraftOriginalSource,
  findLatestReplyDraftOfferMessage,
  hasReplyDraftOffer,
  isReplyDraftAffirmation,
  REPLY_DRAFT_OFFER_TEXT,
  resolveReplyDraftTargetLanguage,
} from "@/lib/shared/replyDraftFollowup";

describe("promptBuilders", () => {
  it("wraps translate_explain input with translation instructions", () => {
    const result = buildInstructionWrappedInput(
      "Hello there",
      "translate_explain"
    );

    expect(result).toContain("Translate the following source message into natural Japanese");
    expect(result).toContain("[原文]");
    expect(result).toContain("[日本語訳]");
    expect(result).toContain("[解説]");
    expect(result).toContain(REPLY_DRAFT_OFFER_TEXT);
    expect(result).toContain("Hello there");
  });

  it("detects reply-draft followup consent after an explanation offer", () => {
    expect(hasReplyDraftOffer(`...\n${REPLY_DRAFT_OFFER_TEXT}`)).toBe(true);
    expect(isReplyDraftAffirmation("はい。短く回答して下さい。")).toBe(true);
    expect(isReplyDraftAffirmation("いいえ、大丈夫です。")).toBe(false);

    const result = buildReplyDraftFollowupInput(
      "はい。短く回答して下さい。",
      "Thanks for reaching out."
    );
    expect(result).toContain("accepted the previous offer");
    expect(result).toContain("Reply language: English.");
    expect(result).toContain(
      "the original source message is from a woman and the reply is from the male user"
    );
    expect(result).toContain("Original source message from [原文]");
    expect(result).toContain("Thanks for reaching out.");
    expect(result).toContain("はい。短く回答して下さい。");
  });

  it("extracts the original source from the latest reply-draft offer", () => {
    const latest = findLatestReplyDraftOfferMessage([
      { role: "assistant", text: "older" },
      {
        role: "assistant",
        text: [
          "[原文]",
          "I hope you are doing well.",
          "",
          "[日本語訳]",
          "お元気でお過ごしのことと思います。",
          "",
          "[解説]",
          "丁寧な書き出しです。",
          "",
          REPLY_DRAFT_OFFER_TEXT,
        ].join("\n"),
      },
    ]);

    expect(latest).toBeTruthy();
    expect(extractReplyDraftOriginalSource(latest?.text || "")).toBe(
      "I hope you are doing well."
    );
  });

  it("resolves reply-draft language from explicit user instruction before source text", () => {
    expect(
      resolveReplyDraftTargetLanguage({
        latestRequest: "はい。ロシア語でカジュアルに。",
        originalSource: "Thanks for reaching out.",
      })
    ).toBe("Russian");
    expect(
      resolveReplyDraftTargetLanguage({
        latestRequest: "Yes",
        originalSource: "Thanks for reaching out.",
      })
    ).toBe("English");
  });

  it("wraps reply_only input with reply-only instructions", () => {
    const result = buildInstructionWrappedInput("Thanks!", "reply_only");

    expect(result).toContain("Output only the reply text.");
    expect(result).toContain(
      "the message is from a woman and the reply is from the male user"
    );
    expect(result).toContain("Message:");
  });

  it("wraps language reply translation modes with output-only instructions", () => {
    const result = buildInstructionWrappedInput(
      "また明日話そう",
      "translate_reply_en"
    );

    expect(result).toContain("Translate the following reply draft into natural English");
    expect(result).toContain("Output only the translated reply text.");
    expect(result).toContain("また明日話そう");
  });

  it("returns raw input for normal instruction mode", () => {
    expect(buildInstructionWrappedInput("plain text", "normal")).toBe(
      "plain text"
    );
  });

  it("builds the single unified base system prompt with long-term memory", () => {
    const memory = createEmptyMemory();
    memory.context.currentTopic = "Tokyo move";
    const result = buildBaseSystemPrompt({
      normalizedMemory: memory,
      reasoningMode: "strict",
    });

    expect(result).not.toContain("You are a helpful conversational assistant.");
    expect(result).toContain("Prefer provided evidence over internal knowledge.");
    expect(result).toContain("Use the long-term memory below only when relevant.");
    expect(result).toContain("== LONG-TERM MEMORY (JSON) ==");
    expect(result).toContain("Tokyo move");
  });

  it("builds the unified search system prompt using search evidence", () => {
    const result = buildSearchSystemPrompt(
      "best schools in tokyo",
      "School A\nSchool B",
      "creative"
    );

    expect(result).toContain("Search query:");
    expect(result).toContain("best schools in tokyo");
    expect(result).toContain("Use only the evidence below for factual claims.");
    expect(result).toContain("EVIDENCE START");
    expect(result).toContain("School A");
  });
});
