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
    expect(messages.at(-1)?.content).toContain("Reply language: English.");
    expect(messages.at(-1)?.content).toContain("はい。短く回答して下さい。");
    expect(messages).toHaveLength(2);
    expect(messages.map((message) => message.content).join("\n")).not.toContain(
      "ご連絡ありがとうございます。"
    );
    expect(messages.map((message) => message.content).join("\n")).not.toContain(
      "丁寧な導入表現です。"
    );
  });

  it("keeps an English reply-draft followup in English for plain Yes consent", () => {
    const messages = buildChatCompletionMessages({
      normalizedMemory: createEmptyMemory(),
      reasoningMode: "strict",
      instructionMode: "normal",
      input: "Yes",
      recentMessages: [
        { role: "user", text: "I hope you are doing well." },
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
            "返信案を作りますか？",
          ].join("\n"),
        },
      ],
    });

    const payload = messages.map((message) => message.content).join("\n");

    expect(messages).toHaveLength(2);
    expect(messages.at(-1)?.content).toContain("Reply language: English.");
    expect(messages.at(-1)?.content).toContain("User's latest request:\nYes");
    expect(payload).toContain(
      "Original source message from [原文]:\nI hope you are doing well."
    );
    expect(payload).not.toContain("お元気でお過ごしのことと思います。");
    expect(payload).not.toContain("丁寧な書き出しです。");
  });

  it("keeps an Italian reply-draft followup in Italian for plain Yes consent", () => {
    const messages = buildChatCompletionMessages({
      normalizedMemory: createEmptyMemory(),
      reasoningMode: "strict",
      instructionMode: "normal",
      input: "Yes",
      recentMessages: [
        { role: "user", text: "Ciao, grazie per il tuo messaggio." },
        {
          role: "assistant",
          text: [
            "[原文]",
            "Ciao, grazie per il tuo messaggio.",
            "",
            "[日本語訳]",
            "こんにちは、ご連絡ありがとうございます。",
            "",
            "[解説]",
            "カジュアルで自然な挨拶です。",
            "",
            "返信案を作りますか？",
          ].join("\n"),
        },
      ],
    });

    const payload = messages.map((message) => message.content).join("\n");

    expect(messages).toHaveLength(2);
    expect(messages.at(-1)?.content).toContain("Reply language: Italian.");
    expect(messages.at(-1)?.content).toContain("User's latest request:\nYes");
    expect(payload).toContain(
      "Original source message from [原文]:\nCiao, grazie per il tuo messaggio."
    );
    expect(payload).not.toContain("こんにちは、ご連絡ありがとうございます。");
    expect(payload).not.toContain("カジュアルで自然な挨拶です。");
  });

  it("omits memory, stored contexts, search context, and recent history for reply-draft followups", () => {
    const memory = createEmptyMemory();
    memory.facts.push("ユーザーは日本語で短く返すことを好む。");
    memory.context.currentTopic = "前回の別件";

    const messages = buildChatCompletionMessages({
      normalizedMemory: memory,
      reasoningMode: "strict",
      instructionMode: "normal",
      input: "Yes",
      recentMessages: [
        { role: "user", text: "Ciao, grazie per il tuo messaggio." },
        {
          role: "assistant",
          text: [
            "[原文]",
            "Ciao, grazie per il tuo messaggio.",
            "",
            "[日本語訳]",
            "こんにちは、ご連絡ありがとうございます。",
            "",
            "[解説]",
            "カジュアルで自然な挨拶です。",
            "",
            "返信案を作りますか？",
          ].join("\n"),
        },
      ],
      storedLibraryContext: "library ctx with unrelated Japanese guidance",
      storedSearchContext: "search ctx with unrelated Japanese guidance",
      storedDocumentContext: "document ctx with unrelated Japanese guidance",
      searchQuery: "unrelated query",
      searchText: "unrelated search evidence",
    });

    const payload = messages.map((message) => message.content).join("\n");

    expect(messages).toHaveLength(2);
    expect(payload).toContain("Reply language: Italian.");
    expect(payload).toContain(
      "Original source message from [原文]:\nCiao, grazie per il tuo messaggio."
    );
    expect(payload).not.toContain("ユーザーは日本語で短く返すことを好む。");
    expect(payload).not.toContain("前回の別件");
    expect(payload).not.toContain("library ctx");
    expect(payload).not.toContain("search ctx");
    expect(payload).not.toContain("document ctx");
    expect(payload).not.toContain("unrelated search evidence");
    expect(payload).not.toContain("こんにちは、ご連絡ありがとうございます。");
    expect(payload).not.toContain("カジュアルで自然な挨拶です。");
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
