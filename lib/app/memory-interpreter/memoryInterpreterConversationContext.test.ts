import { describe, expect, it } from "vitest";
import { buildMeaningfulConversationContext } from "@/lib/app/memory-interpreter/memoryInterpreterConversationContext";

describe("memoryInterpreterConversationContext", () => {
  it("collects the two most recent meaningful utterances excluding the latest user text", () => {
    const result = buildMeaningfulConversationContext([
      {
        id: "g1",
        role: "gpt",
        text: "ひとつ前のチャット系GPT通常レス",
        meta: { kind: "normal", sourceType: "gpt_input" },
      },
      {
        id: "u1",
        role: "user",
        text: "最新ユーザー発話",
      },
      {
        id: "g2",
        role: "gpt",
        text: "直近のタスク系GPT通常レス",
        meta: { kind: "task_prep", sourceType: "gpt_input" },
      },
    ]);

    expect(result.priorMeaningfulText).toBe("直近のタスク系GPT通常レス");
    expect(result.earlierMeaningfulText).toBe("ひとつ前のチャット系GPT通常レス");
  });

  it("can use a user utterance as the second prior meaningful text", () => {
    const result = buildMeaningfulConversationContext([
      {
        id: "u0",
        role: "user",
        text: "さらに一個前の意味あるユーザー発話",
      },
      {
        id: "u1",
        role: "user",
        text: "最新ユーザー発話",
      },
      {
        id: "g2",
        role: "gpt",
        text: "直近のチャット系GPT通常レス",
        meta: { kind: "normal", sourceType: "gpt_input" },
      },
    ]);

    expect(result.priorMeaningfulText).toBe("直近のチャット系GPT通常レス");
    expect(result.earlierMeaningfulText).toBe("さらに一個前の意味あるユーザー発話");
  });
});
