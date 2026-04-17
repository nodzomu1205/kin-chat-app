import { describe, expect, it, vi } from "vitest";
import {
  appendTaskFlowAssistantResult,
  appendTaskFlowRecentMessage,
  applyTaskFlowSummaryUsage,
  startTaskFlowRequest,
} from "@/lib/app/taskDraftFlowShared";
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
      lastUserIntent: "タスク整理: Prepared task",
    });

    expect(setGptMessages).toHaveBeenCalledTimes(1);
    expect(persistCurrentGptState).toHaveBeenCalledTimes(1);
    expect(setGptState).not.toHaveBeenCalled();
  });

  it("applies summary usage after GPT memory handling resolves", async () => {
    const applySummaryUsage = vi.fn();
    const handleGptMemory = vi.fn(async () => ({
      summaryUsage: {
        inputTokens: 10,
        outputTokens: 3,
        totalTokens: 13,
      },
    }));

    await applyTaskFlowSummaryUsage({
      recentMessages: [{ id: "g1", role: "gpt", text: "prepared" }],
      applySummaryUsage,
      handleGptMemory,
      currentTaskTitleOverride: "Prepared task",
      lastUserIntent: "タスク整理: Prepared task",
    });

    expect(handleGptMemory).toHaveBeenCalledTimes(1);
    expect(applySummaryUsage).toHaveBeenCalledWith({
      inputTokens: 10,
      outputTokens: 3,
      totalTokens: 13,
    });
  });
});
