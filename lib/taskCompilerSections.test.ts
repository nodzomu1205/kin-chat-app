import { describe, expect, it } from "vitest";
import {
  buildConstraints,
  buildDeliveryLimits,
  buildRuleLines,
} from "@/lib/taskCompilerSections";
import type { TaskIntent } from "@/types/taskProtocol";

function createIntent(overrides?: Partial<TaskIntent["workflow"]>): TaskIntent {
  return {
    mode: "task",
    goal: "Goal",
    output: {
      type: "essay",
      language: "ja",
      length: "long",
    },
    workflow: {
      searchRequestCount: 3,
      searchRequestCountRule: "up_to",
      youtubeTranscriptRequestCount: 2,
      youtubeTranscriptRequestCountRule: "exact",
      allowSearchRequest: true,
      allowYoutubeTranscriptRequest: true,
      finalizationPolicy: "auto_when_ready",
      ...overrides,
    },
    constraints: ["You can perform up to 2 searches."],
  };
}

describe("taskCompilerSections", () => {
  it("keeps delivery guidance for presentation tasks", () => {
    const intent: TaskIntent = {
      ...createIntent(),
      output: {
        type: "presentation",
        language: "ja",
        length: "long",
      },
    };

    expect(buildDeliveryLimits(intent)).toContain(
      "- Prefer a compact, high-impact presentation style before using multi-part output."
    );
  });

  it("renders constraints directly", () => {
    expect(buildConstraints(createIntent())).toEqual([
      "- You can perform up to 2 searches.",
    ]);
  });

  it("uses task-constraint wording in rule lines", () => {
    const lines = buildRuleLines(createIntent());
    expect(lines.some((line) => line.includes("task constraints are satisfied"))).toBe(true);
  });
});
