import { describe, expect, it } from "vitest";
import {
  buildInitialRequirementProgress,
  markRequirementProgress,
  toUserFacingRequests,
} from "@/lib/taskProgress";
import type { PendingExternalRequest, TaskIntent } from "@/types/taskProtocol";

function createIntent(overrides?: Partial<TaskIntent>): TaskIntent {
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
    },
    constraints: [
      "You can perform up to 2 searches.",
      "You can make up to 3 requests to GPT.",
      "Please summarize the final output within 1000 characters.",
    ],
    ...overrides,
  };
}

describe("taskProgress", () => {
  it("builds requirement progress from constraints before workflow", () => {
    const progress = buildInitialRequirementProgress(createIntent());

    expect(progress.find((item) => item.kind === "search_request")?.label).toBe(
      "検索"
    );
    expect(
      progress.find((item) => item.kind === "search_request")?.targetCount
    ).toBe(2);
    expect(progress.find((item) => item.kind === "ask_gpt")?.label).toBe(
      "GPTへの依頼"
    );
    expect(progress.find((item) => item.kind === "ask_gpt")?.targetCount).toBe(
      3
    );
    expect(progress.find((item) => item.kind === "finalize")?.label).toBe(
      "最終成果物"
    );
  });

  it("marks request constraints as optional and final output as required", () => {
    const progress = buildInitialRequirementProgress(createIntent());

    expect(
      progress.find((item) => item.kind === "search_request")?.category
    ).toBe("optional");
    expect(progress.find((item) => item.kind === "ask_gpt")?.category).toBe(
      "optional"
    );
    expect(progress.find((item) => item.kind === "finalize")?.category).toBe(
      "required"
    );
  });

  it("treats at_least request constraints as required", () => {
    const progress = buildInitialRequirementProgress(
      createIntent({
        constraints: ["Make at least 2 requests to GPT."],
        workflow: {},
      })
    );

    expect(progress.find((item) => item.kind === "ask_gpt")?.category).toBe(
      "required"
    );
    expect(progress.find((item) => item.kind === "ask_gpt")?.rule).toBe(
      "at_least"
    );
  });

  it("treats around constraints as optional guidance", () => {
    const progress = buildInitialRequirementProgress(
      createIntent({
        constraints: ["Please summarize the final output around 1000 characters."],
        workflow: {},
      })
    );

    expect(progress.find((item) => item.kind === "finalize")?.category).toBe(
      "required"
    );
    expect(progress.find((item) => item.kind === "finalize")?.rule).toBe(
      "around"
    );
  });

  it("keeps unknown request rules optional instead of forcing up_to", () => {
    const progress = buildInitialRequirementProgress(
      createIntent({
        constraints: ["Restrict to 2 searches.", "Limit to 3 requests to GPT."],
        workflow: {},
      })
    );

    expect(progress.find((item) => item.kind === "search_request")?.category).toBe(
      "optional"
    );
    expect(progress.find((item) => item.kind === "search_request")?.rule).toBe(
      "unknown"
    );
    expect(progress.find((item) => item.kind === "ask_gpt")?.category).toBe(
      "optional"
    );
    expect(progress.find((item) => item.kind === "ask_gpt")?.rule).toBe(
      "unknown"
    );
  });

  it("parses Japanese constraint wording through the same constraints path", () => {
    const progress = buildInitialRequirementProgress(
      createIntent({
        constraints: [
          "検索は3回までにしてください。",
          "ユーザー確認は1回ちょうど行ってください。",
          "最終成果物は1000文字前後で要約してください。",
        ],
        workflow: {},
      })
    );

    expect(progress.find((item) => item.kind === "search_request")).toEqual(
      expect.objectContaining({
        label: "検索",
        targetCount: 3,
        rule: "up_to",
      })
    );
    expect(progress.find((item) => item.kind === "ask_user")).toEqual(
      expect.objectContaining({
        label: "ユーザー確認",
        targetCount: 1,
        rule: "exact",
      })
    );
    expect(progress.find((item) => item.kind === "finalize")).toEqual(
      expect.objectContaining({
        label: "最終成果物",
        rule: "around",
      })
    );
  });

  it("falls back to workflow when matching constraints are absent", () => {
    const progress = buildInitialRequirementProgress(
      createIntent({
        constraints: [],
        workflow: {
          askGptCount: 2,
          allowSearchRequest: true,
          searchRequestCount: 1,
        },
      })
    );

    expect(progress.find((item) => item.kind === "ask_gpt")?.targetCount).toBe(
      2
    );
    expect(
      progress.find((item) => item.kind === "search_request")?.targetCount
    ).toBe(1);
    expect(progress.find((item) => item.kind === "finalize")).toBeTruthy();
  });

  it("marks requirement progress with increment and done status", () => {
    const base = buildInitialRequirementProgress(createIntent());
    const next = markRequirementProgress(base, "ask_gpt");

    const askGpt = next.find((item) => item.kind === "ask_gpt");
    expect(askGpt?.completedCount).toBe(1);
    expect(askGpt?.status).toBe("in_progress");
  });

  it("does not change unrelated progress kinds", () => {
    const base = buildInitialRequirementProgress(createIntent());
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
