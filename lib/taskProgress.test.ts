import { describe, expect, it } from "vitest";
import { buildInitialRequirementProgress, markRequirementProgress, toUserFacingRequests } from "@/lib/taskProgress";
import type { PendingExternalRequest, TaskIntent } from "@/types/taskProtocol";

function createIntent(overrides?: Partial<TaskIntent["workflow"]>): TaskIntent {
  return {
    mode: "task",
    goal: "Review five videos",
    output: {
      type: "essay",
      language: "ja",
    },
    workflow: {
      askGptCount: 2,
      searchRequestCount: 3,
      searchRequestCountRule: "up_to",
      youtubeTranscriptRequestCount: 5,
      allowSearchRequest: true,
      allowYoutubeTranscriptRequest: true,
      ...overrides,
    },
  };
}

describe("taskProgress", () => {
  it("builds requirement progress from task intent workflow", () => {
    const progress = buildInitialRequirementProgress(createIntent());

    expect(progress.some((item) => item.kind === "ask_gpt")).toBe(true);
    expect(progress.some((item) => item.kind === "search_request")).toBe(true);
    expect(
      progress.some((item) => item.kind === "youtube_transcript_request")
    ).toBe(true);
    expect(progress.some((item) => item.kind === "finalize")).toBe(true);
  });

  it("marks up_to search workflow as optional and exact transcript workflow as required", () => {
    const progress = buildInitialRequirementProgress(createIntent());

    expect(
      progress.find((item) => item.kind === "search_request")?.category
    ).toBe("optional");
    expect(
      progress.find((item) => item.kind === "youtube_transcript_request")
        ?.category
    ).toBe("required");
  });

  it("marks requirement progress with increment and done status", () => {
    const base = buildInitialRequirementProgress(
      createIntent({ askGptCount: 1 })
    );
    const next = markRequirementProgress(base, "ask_gpt");

    const askGpt = next.find((item) => item.kind === "ask_gpt");
    expect(askGpt?.completedCount).toBe(1);
    expect(askGpt?.status).toBe("done");
  });

  it("does not change unrelated progress kinds", () => {
    const base = buildInitialRequirementProgress(createIntent({ askGptCount: 1 }));
    const next = markRequirementProgress(base, "search_request");

    expect(next.find((item) => item.kind === "search_request")?.completedCount).toBe(1);
    expect(next.find((item) => item.kind === "ask_gpt")?.completedCount).toBe(0);
  });

  it("filters user-facing requests down to pending only", () => {
    const pendingRequests: PendingExternalRequest[] = [
      {
        id: "Q001",
        taskId: "111",
        actionId: "Q001",
        target: "user",
        kind: "question",
        body: "Need a preference",
        status: "pending",
        createdAt: 1,
        required: true,
      },
      {
        id: "Q002",
        taskId: "111",
        actionId: "Q002",
        target: "user",
        kind: "question",
        body: "Already answered",
        status: "answered",
        createdAt: 2,
        answeredAt: 3,
        answerText: "done",
        required: false,
      },
    ];

    const userFacing = toUserFacingRequests(pendingRequests);
    expect(userFacing).toHaveLength(1);
    expect(userFacing[0]?.requestId).toBe("Q001");
    expect(userFacing[0]?.body).toBe("Need a preference");
  });
});
