import { describe, expect, it } from "vitest";
import {
  buildFollowUpRule,
  buildGoal,
} from "@/lib/app/memory-interpreter/memoryInterpreterContextPhrasing";

describe("memoryInterpreterContextPhrasing", () => {
  it("builds goal and follow-up strings from a topic", () => {
    expect(buildGoal("チェーホフ")).toContain("チェーホフ");
    expect(buildFollowUpRule("チェーホフ")).toContain("チェーホフ");
  });
});
