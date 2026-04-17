import { describe, expect, it } from "vitest";
import {
  buildCompletionCriteria,
  buildDeliveryLimits,
  buildOptionalWorkflow,
  buildRequiredWorkflow,
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
    constraints: [],
  };
}

describe("taskCompilerSections", () => {
  it("keeps up_to search workflow optional while exact transcript workflow stays required", () => {
    const intent = createIntent();

    expect(buildRequiredWorkflow(intent)).toContain(
      "- Request YouTube transcript support exactly 2 time(s)."
    );
    expect(buildRequiredWorkflow(intent)).not.toContain(
      "- Request web search support exactly 3 time(s)."
    );
    expect(buildOptionalWorkflow(intent)).toContain(
      "- You may request web search support up to 3 time(s)."
    );
  });

  it("keeps up_to ask-gpt workflow optional instead of required", () => {
    const intent = createIntent({
      askGptCount: 3,
      askGptCountRule: "up_to",
    });

    expect(buildRequiredWorkflow(intent)).not.toContain(
      "- Ask GPT no more than 3 time(s) before finalizing."
    );
    expect(buildOptionalWorkflow(intent)).toContain(
      "- You may ask GPT up to 3 time(s)."
    );
  });

  it("adds presentation-specific completion and delivery guidance", () => {
    const intent: TaskIntent = {
      ...createIntent(),
      output: {
        type: "presentation",
        language: "ja",
        length: "long",
      },
    };

    expect(buildCompletionCriteria(intent)[0]).toContain(
      "presentation-style piece"
    );
    expect(buildDeliveryLimits(intent)).toContain(
      "- Prefer a compact, high-impact presentation style before using multi-part output."
    );
  });
});
