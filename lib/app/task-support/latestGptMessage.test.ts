import { describe, expect, it } from "vitest";
import {
  findLatestTransferableGptMessage,
  isLatestGptStatusMessage,
} from "@/lib/app/task-support/latestGptMessage";
import type { Message } from "@/types/chat";

describe("latestGptMessage", () => {
  it("treats Kin transfer status notices as non-transferable", () => {
    const message: Message = {
      id: "m1",
      role: "gpt",
      text: "Latest GPT content was set to Kin input as <<SYS_INFO>>. TASK_SLOT: #01",
      meta: {
        kind: "task_info",
        sourceType: "gpt_chat",
      },
    };

    expect(isLatestGptStatusMessage(message)).toBe(true);
  });

  it("keeps library display messages transferable", () => {
    const message: Message = {
      id: "m2",
      role: "gpt",
      text: "Summary:\nA useful excerpt from the reference item.",
      meta: {
        kind: "task_info",
        sourceType: "manual",
      },
    };

    expect(isLatestGptStatusMessage(message)).toBe(false);
  });

  it("returns the latest meaningful GPT message while skipping status notices", () => {
    const messages: Message[] = [
      {
        id: "old-status",
        role: "gpt",
        text: "The latest GPT response is ready to transfer to Kin.",
        meta: {
          kind: "task_info",
          sourceType: "gpt_chat",
        },
      },
      {
        id: "library",
        role: "gpt",
        text: "Summary:\nA useful excerpt from the reference item.",
        meta: {
          kind: "task_info",
          sourceType: "manual",
        },
      },
      {
        id: "latest-status",
        role: "gpt",
        text: "Latest GPT content was set to Kin input as <<SYS_INFO>>. TASK_SLOT: #01",
        meta: {
          kind: "task_info",
          sourceType: "gpt_chat",
        },
      },
    ];

    expect(findLatestTransferableGptMessage(messages)?.id).toBe("library");
  });
});
