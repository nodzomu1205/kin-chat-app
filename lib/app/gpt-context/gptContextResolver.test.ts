import { describe, expect, it } from "vitest";
import { normalizePromptTopic } from "@/lib/app/gpt-context/gptContextResolver";

describe("gptContextResolver", () => {
  it("does not truncate greeting text", () => {
    expect(normalizePromptTopic("こんにちは！")).toBe("こんにちは");
  });

  it("extracts direct requested topics", () => {
    expect(normalizePromptTopic("ナポレオンについて教えてください")).toBe("ナポレオン");
    expect(normalizePromptTopic("ソクラテスのことを教えて下さい")).toBe("ソクラテス");
  });

  it("drops weak acknowledgement-only surfaces", () => {
    expect(normalizePromptTopic("なるほど！")).toBe("");
    expect(normalizePromptTopic("OK")).toBe("");
  });
});
