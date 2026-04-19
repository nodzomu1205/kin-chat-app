import { describe, expect, it } from "vitest";
import { buildMeaningfulConversationContext } from "@/lib/app/memoryInterpreterConversationContext";

describe("memoryInterpreterConversationContext task-info handling", () => {
  it("includes non-SYS task_info messages and ignores SYS-formatted ones", () => {
    const result = buildMeaningfulConversationContext([
      {
        id: "g1",
        role: "gpt",
        text: "<<SYS_TASK>>\nBODY: hidden\n<<END_SYS_TASK>>",
        meta: { kind: "task_info", sourceType: "manual" },
      },
      {
        id: "g2",
        role: "gpt",
        text: "Task detail was displayed in the chat window.",
        meta: { kind: "task_info", sourceType: "manual" },
      },
      {
        id: "u1",
        role: "user",
        text: "Library: Review Notes\n\nDetail:\nNapoleon remained influential in French political memory.",
        meta: { kind: "task_info", sourceType: "manual" },
      },
    ]);

    expect(result.priorMeaningfulText).toBe("Task detail was displayed in the chat window.");
    expect(result.earlierMeaningfulText).toContain("Library: Review Notes");
  });
});
