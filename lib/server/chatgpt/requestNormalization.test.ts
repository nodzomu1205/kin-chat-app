import { describe, expect, it } from "vitest";
import {
  normalizeChatMessages,
  normalizeInstructionMode,
  normalizeMemoryInput,
  normalizeReasoningMode,
  resolveChatRouteMode,
} from "@/lib/server/chatgpt/requestNormalization";

describe("requestNormalization", () => {
  it("resolves only supported route modes", () => {
    expect(resolveChatRouteMode({ mode: "chat" })).toBe("chat");
    expect(resolveChatRouteMode({ mode: "compact_recent" })).toBe("compact_recent");
    expect(resolveChatRouteMode({ mode: "memory_interpret" })).toBe(
      "memory_interpret"
    );
    expect(resolveChatRouteMode({ mode: "other" })).toBeNull();
    expect(resolveChatRouteMode(null)).toBeNull();
  });

  it("normalizes instruction and reasoning modes safely", () => {
    expect(normalizeInstructionMode("translate_explain")).toBe(
      "translate_explain"
    );
    expect(normalizeInstructionMode("reply_only")).toBe("reply_only");
    expect(normalizeInstructionMode("polish")).toBe("polish");
    expect(normalizeInstructionMode("unknown")).toBe("normal");

    expect(normalizeReasoningMode("strict")).toBe("strict");
    expect(normalizeReasoningMode("creative")).toBe("creative");
    expect(normalizeReasoningMode("other")).toBe("creative");
  });

  it("filters invalid chat messages", () => {
    const normalized = normalizeChatMessages([
      { role: "user", text: "hello" },
      { role: "assistant", text: "hi" },
      { role: "bad", text: "skip" },
      { role: "gpt", text: 123 },
      null,
    ]);

    expect(normalized).toEqual([
      { role: "user", text: "hello" },
      { role: "assistant", text: "hi" },
    ]);
  });

  it("normalizes memory input from string, object, or empty value", () => {
    expect(normalizeMemoryInput(null)).toEqual(
      expect.objectContaining({
        facts: [],
        preferences: [],
      })
    );

    expect(
      normalizeMemoryInput('{"facts":["a"],"preferences":[],"lists":{},"context":{}}')
    ).toEqual(
      expect.objectContaining({
        facts: ["a"],
      })
    );

    expect(
      normalizeMemoryInput({
        facts: ["b"],
        preferences: [],
        lists: {},
        context: {},
      })
    ).toEqual(
      expect.objectContaining({
        facts: ["b"],
      })
    );
  });
});

