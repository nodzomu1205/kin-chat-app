import { describe, expect, it } from "vitest";
import {
  buildConstraints,
  buildDeliveryLimits,
  buildEventExampleBlocks,
  buildRuleLines,
} from "@/lib/task/taskCompilerSections";
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

  it("keeps library flow guidance minimal", () => {
    const lines = buildRuleLines(
      createIntent({ allowLibraryReference: true })
    ).join("\n");

    expect(lines).toContain("<<SYS_LIBRARY_DATA_REQUEST>>");
    expect(lines).toContain("<<SYS_LIBRARY_DATA_RESPONSE>>");
    expect(lines).not.toContain("do not request index");
    expect(lines).not.toContain("library-reference allowance");
  });

  it("includes only allowed protocol examples in task prompts", () => {
    const baselineExamples = buildEventExampleBlocks(
      "TASK-1",
      createIntent({
        allowSearchRequest: false,
        allowYoutubeTranscriptRequest: false,
        allowLibraryReference: false,
        askGptCount: undefined,
        askUserCount: undefined,
      })
    ).join("\n");

    expect(baselineExamples).toContain("TASK_PROGRESS");
    expect(baselineExamples).toContain("TASK_DONE");
    expect(baselineExamples).not.toContain("SYS_SEARCH_REQUEST");
    expect(baselineExamples).not.toContain("SYS_LIBRARY_DATA_REQUEST");
    expect(baselineExamples).toContain("SYS_DRAFT_PREPARATION_REQUEST");
    expect(baselineExamples).toContain("SYS_DRAFT_MODIFICATION_REQUEST");
    expect(baselineExamples).toContain("SYS_FILE_SAVING_REQUEST");

    const draftExamples = buildEventExampleBlocks(
      "TASK-1",
      createIntent({
        allowSearchRequest: false,
        allowYoutubeTranscriptRequest: false,
        allowDraftPreparation: true,
      })
    ).join("\n");

    expect(draftExamples).toContain("SYS_DRAFT_PREPARATION_REQUEST");
    expect(draftExamples).toContain("SYS_FILE_SAVING_REQUEST");
  });

  it("includes document draft and saving rules for essay tasks by default", () => {
    const lines = buildRuleLines(createIntent()).join("\n");

    expect(lines).toContain("SYS_DRAFT_PREPARATION_REQUEST");
    expect(lines).toContain("SYS_DRAFT_MODIFICATION_REQUEST");
    expect(lines).toContain("SYS_FILE_SAVING_REQUEST");
  });
});
