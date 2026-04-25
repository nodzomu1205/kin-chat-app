import { describe, expect, it, vi } from "vitest";
import {
  appendKinTransferInfoMessage,
  buildKinTaskInjectionStatusText,
  createTaskUsageAccumulator,
} from "@/lib/app/task-runtime/kinTransferFlowBuilders";

describe("kinTransferFlowBuilders", () => {
  it("accumulates task usage before flushing once", () => {
    const applyTaskUsage = vi.fn();
    const accumulator = createTaskUsageAccumulator(applyTaskUsage);

    accumulator.add({ inputTokens: 2, outputTokens: 3, totalTokens: 5 });
    accumulator.add({ inputTokens: 7, outputTokens: 11, totalTokens: 18 });
    accumulator.flush();

    expect(applyTaskUsage).toHaveBeenCalledWith({
      inputTokens: 9,
      outputTokens: 14,
      totalTokens: 23,
    });
  });

  it("builds Kin task injection status text for single and multipart injections", () => {
    expect(
      buildKinTaskInjectionStatusText({
        subject: "Current instruction",
        taskId: "123456",
        partCount: 1,
      })
    ).toBe(
      "Current instruction was converted into a formal Kin task and set to Kin input. TASK_ID: #123456"
    );

    expect(
      buildKinTaskInjectionStatusText({
        subject: "Latest GPT content",
        taskId: "abc",
        partCount: 3,
      })
    ).toBe(
      "Latest GPT content was converted into a formal Kin task and split into 3 Kin parts. TASK_ID: #abc"
    );
  });

  it("appends a task-info message with the requested source type", () => {
    const setGptMessages = vi.fn((updater) => updater([]));

    const result = appendKinTransferInfoMessage({
      setGptMessages,
      sourceType: "gpt_chat",
      text: "Ready",
    });

    expect(result).toBeUndefined();
    const nextMessages = setGptMessages.mock.results[0]?.value;
    expect(nextMessages).toEqual([
      expect.objectContaining({
        role: "gpt",
        text: "Ready",
        meta: {
          kind: "task_info",
          sourceType: "gpt_chat",
        },
      }),
    ]);
  });
});
