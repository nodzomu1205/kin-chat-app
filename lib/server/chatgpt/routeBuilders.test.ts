import { describe, expect, it } from "vitest";
import { createEmptyMemory } from "@/lib/memory";
import {
  buildChatCompletionMessages,
  buildChatSearchPayload,
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
      })
    ).toEqual({
      sources: [{ title: "A", link: "https://example.com" }],
      searchUsed: true,
      searchQuery: "farmers 360",
      searchSeriesId: "SERIES-1",
      searchContinuationToken: "TOKEN-1",
      searchEvidence: "evidence",
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

  it("builds the memory update prompt from normalized memory and messages", () => {
    const prompt = buildMemoryUpdatePrompt({
      normalizedMemory: createEmptyMemory(),
      safeMessages: [{ role: "user", text: "hello" }],
    });

    expect(prompt).toContain("You are a memory updater for a chat system.");
    expect(prompt).toContain("Existing memory JSON:");
    expect(prompt).toContain("user: hello");
  });
});
