import { describe, expect, it } from "vitest";
import { buildChatApiRequestPayload } from "@/lib/app/send-to-gpt/sendToGptFlowRequestPayload";

describe("buildChatApiRequestPayload", () => {
  it("keeps app-side reasoning mode typed while building the chat API payload", () => {
    const payload = buildChatApiRequestPayload({
      requestMemory: { facts: [] },
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
});
