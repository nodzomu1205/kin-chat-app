import { describe, expect, it } from "vitest";
import { createEmptyMemory } from "@/lib/memory-domain/memory";
import { buildChatApiRequestPayload } from "@/lib/app/send-to-gpt/sendToGptFlowRequestPayload";
import { buildChatApiSearchRequestPayload } from "@/lib/app/send-to-gpt/sendToGptFlowRequestBuilders";

describe("buildChatApiRequestPayload", () => {
  it("keeps app-side reasoning mode typed while building the chat API payload", () => {
    const payload = buildChatApiRequestPayload({
      requestMemory: createEmptyMemory(),
      recentMessages: [],
      input: "hello",
      storedLibraryContext: "",
      searchMode: "normal",
      searchEngines: ["google_search"],
      searchLocation: "Japan",
      instructionMode: "normal",
      reasoningMode: "strict",
    });

    expect(payload).toMatchObject({
      mode: "chat",
      input: "hello",
      reasoningMode: "strict",
      searchMode: "normal",
      searchEngines: ["google_search"],
      searchLocation: "Japan",
    });
  });

  it("passes the search summary generation preference to the chat API payload", () => {
    const payload = buildChatApiRequestPayload({
      requestMemory: createEmptyMemory(),
      recentMessages: [],
      input: "search: example",
      storedLibraryContext: "",
      searchMode: "normal",
      searchEngines: ["google_search"],
      searchLocation: "Japan",
      generateSearchSummary: false,
      instructionMode: "normal",
      reasoningMode: "strict",
    });

    expect(payload.generateSearchSummary).toBe(false);
  });

  it("forces search summary generation for Kin protocol search requests", () => {
    const payload = buildChatApiSearchRequestPayload({
      requestMemory: createEmptyMemory(),
      recentMessages: [],
      finalRequestText: "<<SYS_SEARCH_REQUEST>>",
      storedDocumentContext: "",
      storedLibraryContext: "",
      cleanQuery: "example",
      searchRequestEvent: {
        taskId: "TASK-1",
        actionId: "S001",
        query: "example",
      },
      effectiveParsedSearchQuery: "",
      effectiveSearchMode: "normal",
      effectiveSearchEngines: ["google_search"],
      effectiveSearchLocation: "Japan",
      autoGenerateSearchLibrarySummary: false,
      instructionMode: "normal",
      reasoningMode: "strict",
    });

    expect(payload.generateSearchSummary).toBe(true);
  });
});
