import { describe, expect, it, vi } from "vitest";
import {
  appendLastGptToKinInfoMessage,
  buildAskAiModeSearchInput,
  runReceiveLastKinResponseToGptInputFlow,
  runSendLastKinToGptDraftFlow,
  runStartAskAiModeSearchFlow,
} from "@/lib/app/send-to-gpt/gptMessageActionFlows";
import type { RunSendToGptFlowArgs } from "@/lib/app/send-to-gpt/sendToGptFlowArgTypes";
import type { Message } from "@/types/chat";

function createBaseFlowArgs(): RunSendToGptFlowArgs {
  return {
    gptInput: "",
    gptLoading: false,
    searchMode: "normal",
    searchEngines: ["google_search"],
    searchLocation: "Japan",
    instructionMode: "normal",
    reasoningMode: "strict",
    autoGenerateLibrarySummary: true,
    parseWrappedSearchResponse: vi.fn(),
    recordSearchContext: vi.fn(),
    getContinuationTokenForSeries: vi.fn(() => ""),
    getAskAiModeLinkForQuery: vi.fn(() => ""),
    applySearchUsage: vi.fn(),
    applyChatUsage: vi.fn(),
    taskProtocolRuntime: {
      currentTaskId: null,
      currentTaskTitle: "",
      currentTaskIntent: null,
      originalInstruction: "",
      compiledTaskPrompt: "",
      taskStatus: "idle",
      latestSummary: "",
      pendingRequests: [],
      userFacingRequests: [],
      completedSearches: [],
      protocolLog: [],
      requirementProgress: [],
    },
    currentTaskId: null,
    findPendingRequest: vi.fn(() => null),
    applyPrefixedTaskFieldsFromText: vi.fn(() => ({})),
    getProtocolLimitViolation: vi.fn(() => null),
    shouldInjectTaskContextWithSettings: vi.fn(() => false),
    referenceLibraryItems: [],
    libraryIndexResponseCount: 0,
    buildLibraryReferenceContext: vi.fn(() => ""),
    taskProtocolAnswerPendingRequest: vi.fn(),
    ingestProtocolMessage: vi.fn(),
    handleGptMemory: vi.fn(async () => ({})),
    applyCompressionUsage: vi.fn(),
    applyIngestUsage: vi.fn(),
    chatRecentLimit: 10,
    gptStateRef: { current: {} },
    setGptMessages: vi.fn(),
    setGptInput: vi.fn(),
    setGptLoading: vi.fn(),
    setKinInput: vi.fn(),
    setPendingKinInjectionBlocks: vi.fn(),
    setPendingKinInjectionIndex: vi.fn(),
    processMultipartTaskDoneText: vi.fn(() => null),
    recordIngestedDocument: vi.fn(() => ({ id: "doc-1" })),
  };
}

describe("gptMessageActionFlows", () => {
  it("builds readable Ask AI Mode input and starts AI-mode search", async () => {
    expect(buildAskAiModeSearchInput("  plan trip  ")).toBe(
      "Ask AI Mode: plan trip"
    );
    expect(buildAskAiModeSearchInput("   ")).toBe("");

    const runSendToGpt = vi.fn(async () => undefined);
    await runStartAskAiModeSearchFlow({
      query: "  plan trip  ",
      searchLocation: "United States",
      buildCommonFlowArgs: createBaseFlowArgs,
      runSendToGpt,
    });

    expect(runSendToGpt).toHaveBeenCalledWith(
      expect.objectContaining({
        gptInput: "Ask AI Mode: plan trip",
        searchMode: "ai",
        searchEngines: ["google_ai_mode"],
        searchLocation: "United States",
      })
    );
  });

  it("copies the latest Kin message into the GPT draft", () => {
    const setGptInput = vi.fn();
    const focusGptPanel = vi.fn();

    runSendLastKinToGptDraftFlow({
      kinMessages: [
        { id: "gpt", role: "gpt", text: "skip" },
        { id: "kin", role: "kin", text: "latest kin" },
      ],
      setGptInput,
      focusGptPanel,
    });

    expect(setGptInput).toHaveBeenCalledWith("latest kin");
    expect(focusGptPanel).toHaveBeenCalled();
  });

  it("wraps receive-last-Kin response state updates", () => {
    const setGptInput = vi.fn();
    const setGptMessages = vi.fn(
      (updater: Message[] | ((prev: Message[]) => Message[])) =>
        typeof updater === "function" ? updater([]) : updater
    );
    const focusGptPanel = vi.fn();

    runReceiveLastKinResponseToGptInputFlow({
      kinMessages: [{ id: "kin", role: "kin", text: "Kin response" }],
      processMultipartTaskDoneText: vi.fn(() => null),
      setGptInput,
      setGptMessages,
      focusGptPanel,
    });

    expect(setGptInput).toHaveBeenCalledWith("Kin response");
    expect(setGptMessages).toHaveBeenCalled();
    expect(focusGptPanel).toHaveBeenCalled();
  });

  it("appends the latest-GPT transfer status message", () => {
    const setGptMessages = vi.fn(
      (updater: Message[] | ((prev: Message[]) => Message[])) =>
        typeof updater === "function" ? updater([]) : updater
    );

    appendLastGptToKinInfoMessage({ setGptMessages });

    expect(setGptMessages).toHaveBeenCalled();
    expect(setGptMessages.mock.results[0]?.value.at(-1)).toEqual(
      expect.objectContaining({
        role: "gpt",
        text: "The latest GPT response is ready to transfer to Kin.",
      })
    );
  });
});
