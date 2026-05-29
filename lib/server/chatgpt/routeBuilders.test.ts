import { describe, expect, it } from "vitest";
import { createEmptyMemory } from "@/lib/memory-domain/memory";
import {
  buildChatCompletionMessages,
  buildChatPromptMetrics,
  buildChatSearchPayload,
  buildMemoryCompactionPrompt,
  buildMemoryUpdatePrompt,
  wantsGoogleMapsLink,
} from "@/lib/server/chatgpt/routeBuilders";

describe("routeBuilders", () => {
  it("detects google maps style link requests", () => {
    expect(wantsGoogleMapsLink("please send a google maps link")).toBe(true);
    expect(wantsGoogleMapsLink("hello")).toBe(false);
  });

  it("builds chat search payload consistently", () => {
    expect(
      buildChatSearchPayload({
        sources: [{ title: "A", link: "https://example.com" }],
        searchUsed: true,
        searchQuery: "farmers 360",
        searchSeriesId: "SERIES-1",
        searchContinuationToken: "TOKEN-1",
        searchEvidence: "evidence",
        searchSummaryText: "summary",
        searchSummaryGenerated: true,
      })
    ).toEqual({
      sources: [{ title: "A", link: "https://example.com" }],
      searchUsed: true,
      searchQuery: "farmers 360",
      searchSeriesId: "SERIES-1",
      searchContinuationToken: "TOKEN-1",
      searchEvidence: "evidence",
      searchSummaryText: "summary",
      searchSummaryGenerated: true,
    });
  });

  it("builds chat completion messages with stored contexts and recent history", () => {
    const messages = buildChatCompletionMessages({
      normalizedMemory: createEmptyMemory(),
      reasoningMode: "strict",
      instructionMode: "normal",
      input: "hello",
      recentMessages: [
        { role: "user", text: "older user" },
        { role: "assistant", text: "older assistant" },
      ],
      storedLibraryContext: "library ctx",
      storedSearchContext: "search ctx",
      storedDocumentContext: "doc ctx",
      searchQuery: "farmers 360",
      searchText: "search evidence",
    });

    expect(messages[0]?.role).toBe("system");
    expect(messages.map((m) => m.content)).toContain("library ctx");
    expect(messages.map((m) => m.content)).toContain("search ctx");
    expect(messages.map((m) => m.content)).toContain("doc ctx");
    expect(messages.at(-1)).toEqual({
      role: "user",
      content: "hello",
    });
  });

  it("turns normal consent after an explanation offer into a reply draft request", () => {
    const messages = buildChatCompletionMessages({
      normalizedMemory: createEmptyMemory(),
      reasoningMode: "strict",
      instructionMode: "normal",
      input: "はい。短く回答して下さい。",
      recentMessages: [
        { role: "user", text: "Thanks for reaching out." },
        {
          role: "assistant",
          text: [
            "[原文]",
            "Thanks for reaching out.",
            "",
            "[日本語訳]",
            "ご連絡ありがとうございます。",
            "",
            "[解説]",
            "丁寧な導入表現です。",
            "",
            "返信案を作りますか？",
          ].join("\n"),
        },
      ],
    });

    expect(messages.at(-1)?.content).toContain(
      "accepted the previous offer to create a reply draft"
    );
    expect(messages.at(-1)?.content).toContain(
      "Original source message from [原文]:\nThanks for reaching out."
    );
    expect(messages.at(-1)?.content).toContain(
      "Do not use the language of a plain acceptance"
    );
    expect(messages.at(-1)?.content).toContain("はい。短く回答して下さい。");
  });

  it("measures the exact chat prompt payload from built messages", () => {
    const normalizedMemory = createEmptyMemory();
    const messages = buildChatCompletionMessages({
      normalizedMemory,
      reasoningMode: "strict",
      instructionMode: "reply_only",
      input: "hello",
      recentMessages: [
        { role: "user", text: "older user" },
        { role: "assistant", text: "older assistant" },
      ],
      storedLibraryContext: "library ctx",
      storedSearchContext: "search ctx",
      storedDocumentContext: "doc ctx",
      searchQuery: "farmers 360",
      searchText: "search evidence",
    });

    const metrics = buildChatPromptMetrics({
      messages,
      normalizedMemory,
      reasoningMode: "strict",
      instructionMode: "reply_only",
      input: "hello",
      recentMessages: [
        { role: "user", text: "older user" },
        { role: "assistant", text: "older assistant" },
      ],
      storedLibraryContext: "library ctx",
      storedSearchContext: "search ctx",
      storedDocumentContext: "doc ctx",
      searchQuery: "farmers 360",
      searchText: "search evidence",
    });

    expect(metrics.messageCount).toBe(messages.length);
    expect(metrics.systemMessageCount).toBe(5);
    expect(metrics.recentMessageCount).toBe(2);
    expect(metrics.storedLibraryChars).toBe("library ctx".length);
    expect(metrics.storedSearchChars).toBe("search ctx".length);
    expect(metrics.storedDocumentChars).toBe("doc ctx".length);
    expect(metrics.recentChars).toBe(
      "older user".length + "older assistant".length
    );
    expect(metrics.rawInputChars).toBe("hello".length);
    expect(metrics.wrappedInputChars).toBeGreaterThan(metrics.rawInputChars);
    expect(metrics.totalChars).toBe(
      messages.reduce((sum, message) => sum + message.content.length, 0)
    );
  });

  it("builds the memory update prompt from normalized memory and messages", () => {
    const prompt = buildMemoryUpdatePrompt({
      normalizedMemory: createEmptyMemory(),
      safeMessages: [{ role: "user", text: "hello" }],
    });

    expect(prompt).toContain("You are a memory updater for a chat system.");
    expect(prompt).toContain("Existing memory JSON:");
    expect(prompt).toContain("user: hello");
  });

  it("builds the memory compaction prompt from normalized memory and messages", () => {
    const prompt = buildMemoryCompactionPrompt({
      normalizedMemory: createEmptyMemory(),
      safeMessages: [{ role: "user", text: "hello" }],
      recentKeep: 4,
    });

    expect(prompt).toContain("chat history compactor");
    expect(prompt).toContain("memory JSON below is already the authoritative state");
    expect(prompt).toContain("The newest 4 messages will be kept verbatim");
  });
});
