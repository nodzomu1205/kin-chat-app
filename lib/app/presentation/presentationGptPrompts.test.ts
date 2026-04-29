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
    expect(prompt).toContain("fill keyMessageFacts close to the maximum of 15");
    expect(prompt).toContain("do not stop at 2-5 keyMessageFacts");
    expect(prompt).toContain("fill keyVisualFacts close to the maximum of 15");
    expect(prompt).not.toContain("4-10");
    expect(prompt).not.toContain("1-6");
    expect(prompt).not.toContain("visible slide material");
  });
});
