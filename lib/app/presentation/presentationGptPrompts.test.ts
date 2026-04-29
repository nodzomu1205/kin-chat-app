import { describe, expect, it } from "vitest";
import { buildCreatePresentationSpecPrompt } from "@/lib/app/presentation/presentationGptPrompts";

describe("presentationGptPrompts", () => {
  it("keeps renderer density out of the mother-spec creation prompt", () => {
    const prompt = buildCreatePresentationSpecPrompt({
      userInstruction: "Create a deck about Russian history.",
    });

    expect(prompt).not.toContain("density");
    expect(prompt).not.toContain("standard");
    expect(prompt).toContain("maximum-detail source record");
    expect(prompt).toContain("up to 15 facts per body");
    expect(prompt).toContain("4-10 keyMessageFacts");
    expect(prompt).toContain("1-6 concrete visual labels");
  });
});
