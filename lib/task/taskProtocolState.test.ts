import { describe, expect, it } from "vitest";
import {
  createEmptyTaskRuntime,
  mergeRequirementProgressForIntent,
} from "@/lib/task/taskProtocolState";
import type { TaskIntent, TaskRequirementProgress } from "@/types/taskProtocol";

const baseIntent: TaskIntent = {
  mode: "task",
  goal: "Research topic",
  output: {
    type: "essay",
    language: "ja",
  },
  workflow: {
    searchRequestCount: 3,
    searchRequestCountRule: "up_to",
    youtubeTranscriptRequestCount: 2,
    youtubeTranscriptRequestCountRule: "exact",
    allowSearchRequest: true,
    allowYoutubeTranscriptRequest: true,
    finalizationPolicy: "auto_when_ready",
  },
  entities: [],
  constraints: [],
};

describe("taskProtocolState", () => {
  it("creates an empty runtime in idle state", () => {
    const runtime = createEmptyTaskRuntime();

    expect(runtime.taskStatus).toBe("idle");
    expect(runtime.currentTaskId).toBeNull();
    expect(runtime.requirementProgress).toEqual([]);
  });

  it("preserves completed counts when merging requirement progress", () => {
    const currentRequirementProgress: TaskRequirementProgress[] = [
      {
        id: "search_request",
        kind: "search_request",
        label: "Search",
        category: "optional",
        targetCount: 3,
        completedCount: 2,
        status: "in_progress",
      },
      {
        id: "youtube_transcript_request",
        kind: "youtube_transcript_request",
        label: "Transcript",
        category: "required",
        targetCount: 2,
        completedCount: 2,
        status: "done",
      },
    ];

    const merged = mergeRequirementProgressForIntent(
      currentRequirementProgress,
      baseIntent
    );

    expect(
      merged.find((item) => item.kind === "search_request")?.completedCount
    ).toBe(2);
    expect(
      merged.find((item) => item.kind === "search_request")?.status
    ).toBe("in_progress");
    expect(
      merged.find((item) => item.kind === "youtube_transcript_request")?.status
    ).toBe("done");
  });
});
