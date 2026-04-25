import { describe, expect, it, vi } from "vitest";
import {
  appendTaskFlowAssistantResult,
  appendTaskFlowRecentMessage,
  buildTaskFlowRecentContext,
  completeTaskFlowSuccess,
  formatTaskFlowErrorMessage,
  applyTaskFlowSummaryUsage,
  startTaskFlowRequest,
} from "@/lib/app/task-draft/taskDraftFlowShared";
import type { Message } from "@/types/chat";

describe("taskDraftFlowShared", () => {
  it("starts a task flow by appending the user message and toggling loading", () => {
    const setGptMessages = vi.fn();
    const setGptInput = vi.fn();
    const setGptLoading = vi.fn();
    const userMessage: Message = { id: "u1", role: "user", text: "prep" };

    startTaskFlowRequest({
      setGptMessages,
      setGptInput,
      setGptLoading,
      userMessage,
    });

    expect(setGptMessages).toHaveBeenCalledTimes(1);
    expect(setGptInput).toHaveBeenCalledWith("");
    expect(setGptLoading).toHaveBeenCalledWith(true);
  });

  it("appends recent messages using the configured limit", () => {
    const result = appendTaskFlowRecentMessage(
      [
        { id: "1", role: "user", text: "a" },
        { id: "2", role: "gpt", text: "b" },
      ],
      2,
      { id: "3", role: "user", text: "c" }
    );

    expect(result.map((message) => message.id)).toEqual(["2", "3"]);
  });

  it("applies assistant results and persists recent messages through the memory bridge", () => {
    const setGptMessages = vi.fn();
    const setGptState = vi.fn();
    const persistCurrentGptState = vi.fn();
    const gptStateRef = {
      current: {
        recentMessages: [],
        memory: {
          facts: [],
          preferences: [],
          lists: {},
          context: {},
        },
      },
    };

    appendTaskFlowAssistantResult({
      setGptMessages,
      assistantMessage: { id: "g1", role: "gpt", text: "prepared" },
      setGptState,
      persistCurrentGptState,
      gptStateRef,
      recentMessages: [{ id: "g1", role: "gpt", text: "prepared" }],
      lastUserIntent: "タスク整琁E Prepared task",
    });

    expect(setGptMessages).toHaveBeenCalledTimes(1);
    expect(persistCurrentGptState).toHaveBeenCalledTimes(1);
    expect(setGptState).not.toHaveBeenCalled();
  });

  it("applies summary usage after GPT memory handling resolves", async () => {
    const applyCompressionUsage = vi.fn();
    const applyChatUsage = vi.fn();
    const handleGptMemory = vi.fn(async () => ({
      compressionUsage: {
        inputTokens: 10,
        outputTokens: 3,
        totalTokens: 13,
      },
      fallbackUsage: null,
      fallbackUsageDetails: null,
      fallbackMetrics: null,
      fallbackDebug: null,
    }));

    await applyTaskFlowSummaryUsage({
      recentMessages: [{ id: "g1", role: "gpt", text: "prepared" }],
      applyChatUsage,
      applyCompressionUsage,
      handleGptMemory,
      currentTaskTitleOverride: "Prepared task",
      lastUserIntent: "タスク整琁E Prepared task",
    });

    expect(handleGptMemory).toHaveBeenCalledTimes(1);
    expect(applyCompressionUsage).toHaveBeenCalledWith({
      inputTokens: 10,
      outputTokens: 3,
      totalTokens: 13,
    });
  });

  it("builds request recent messages from the current GPT state and optional user input", () => {
    const result = buildTaskFlowRecentContext({
      gptStateRef: {
        current: {
          recentMessages: [{ id: "1", role: "user", text: "a" }],
          memory: {
            facts: [],
            preferences: [],
            lists: {},
            context: {},
          },
        },
      } as never,
      chatRecentLimit: 3,
      userMessage: { id: "2", role: "gpt", text: "b" },
    });

    expect(result.baseRecentMessages).toEqual([
      { id: "1", role: "user", text: "a" },
    ]);
    expect(result.requestRecentMessages).toEqual([
      { id: "1", role: "user", text: "a" },
      { id: "2", role: "gpt", text: "b" },
    ]);
  });

  it("completes a task flow success by appending the assistant result and replaying summary usage", async () => {
    const setGptMessages = vi.fn();
    const setGptState = vi.fn();
    const persistCurrentGptState = vi.fn();
    const applyCompressionUsage = vi.fn();
    const applyChatUsage = vi.fn();
    const handleGptMemory = vi.fn(async () => ({
      compressionUsage: {
        inputTokens: 5,
        outputTokens: 2,
        totalTokens: 7,
      },
      fallbackUsage: null,
      fallbackUsageDetails: null,
      fallbackMetrics: null,
      fallbackDebug: null,
    }));

    const updatedRecentMessages = await completeTaskFlowSuccess({
      setGptMessages,
      assistantMessage: { id: "g1", role: "gpt", text: "prepared" },
      setGptState,
      persistCurrentGptState,
      gptStateRef: {
        current: {
          recentMessages: [{ id: "u1", role: "user", text: "prep" }],
          memory: {
            facts: [],
            preferences: [],
            lists: {},
            context: {},
          },
        },
      } as never,
      requestRecentMessages: [{ id: "u1", role: "user", text: "prep" }],
      chatRecentLimit: 4,
      lastUserIntent: "Task prep",
      applyChatUsage,
      applyCompressionUsage,
      handleGptMemory,
      currentTaskTitleOverride: "Prepared task",
    });

    expect(updatedRecentMessages).toEqual([
      { id: "u1", role: "user", text: "prep" },
      { id: "g1", role: "gpt", text: "prepared" },
    ]);
    expect(setGptMessages).toHaveBeenCalledTimes(1);
    expect(persistCurrentGptState).toHaveBeenCalledTimes(1);
    expect(handleGptMemory).toHaveBeenCalledTimes(1);
    expect(applyCompressionUsage).toHaveBeenCalledWith({
      inputTokens: 5,
      outputTokens: 2,
      totalTokens: 7,
    });
  });

  it("formats task flow errors with the error message when available", () => {
    expect(
      formatTaskFlowErrorMessage(
        "Task preparation failed.",
        new Error("Something went wrong")
      )
    ).toBe("Task preparation failed. (Something went wrong)");

    expect(formatTaskFlowErrorMessage("Task preparation failed.", null)).toBe(
      "Task preparation failed."
    );
  });
});

