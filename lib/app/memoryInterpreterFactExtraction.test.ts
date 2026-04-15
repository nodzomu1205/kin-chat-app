import { describe, expect, it } from "vitest";
import {
  extractFacts,
  pruneFactsForTopic,
} from "@/lib/app/memoryInterpreterFactExtraction";
import type { Message } from "@/types/chat";

function buildMessage(role: Message["role"], text: string): Message {
  return { id: `${role}-${text}`, role, text };
}

describe("memoryInterpreterFactExtraction", () => {
  it("extracts useful fact sentences and ignores follow-up invitations", () => {
    expect(
      extractFacts([
        buildMessage(
          "gpt",
          "ドストエフスキーはロシアの小説家です。\n興味があれば、他に知りたいことも教えてくださいね。"
        ),
      ])
    ).toEqual(["ドストエフスキーはロシアの小説家です。"]);
  });

  it("merges or replaces facts based on topic switching", () => {
    expect(pruneFactsForTopic(["old"], ["new"], false)).toEqual(["old", "new"]);
    expect(pruneFactsForTopic(["old"], ["new"], true)).toEqual(["new"]);
  });
});
