import { describe, expect, it } from "vitest";
import type { TaskProtocolEvent, TaskRuntimeState } from "@/types/taskProtocol";
import { applyTaskProtocolEvent, resolveTaskExecutionStatus } from "@/lib/taskProtocolRuntime";

function createRuntime(): TaskRuntimeState {
  return {
    currentTaskId: "123456",
    currentTaskTitle: "Test Task",
    currentTaskIntent: null,
    compiledTaskPrompt: "",
    taskStatus: "running",
    latestSummary: "",
    requirementProgress: [
      {
        id: "ask_gpt",
        label: "Ask GPT",
        category: "required",
        kind: "ask_gpt",
        targetCount: 2,
        completedCount: 0,
        status: "not_started",
      },
      {
        id: "ask_user",
        label: "Ask user",
        category: "optional",
        kind: "ask_user",
        targetCount: 1,
        completedCount: 0,
        status: "not_started",
      },
      {
        id: "search_request",
        label: "Search",
        category: "optional",
        kind: "search_request",
        targetCount: 2,
        completedCount: 0,
        status: "not_started",
      },
      {
        id: "youtube_transcript_request",
        label: "Transcript",
        category: "required",
        kind: "youtube_transcript_request",
        targetCount: 2,
        completedCount: 0,
        status: "not_started",
      },
      {
        id: "library_reference",
        label: "Library",
        category: "optional",
        kind: "library_reference",
        targetCount: 1,
        completedCount: 0,
        status: "not_started",
      },
      {
        id: "finalize",
        label: "Finalize",
        category: "required",
        kind: "finalize",
        targetCount: 1,
        completedCount: 0,
        status: "not_started",
      },
    ],
    pendingRequests: [],
    userFacingRequests: [],
    completedSearches: [],
    protocolLog: [],
  };
}

function createEvent(
  overrides: Partial<TaskProtocolEvent> & Pick<TaskProtocolEvent, "type">
): TaskProtocolEvent {
  return {
    type: overrides.type,
    body: overrides.body ?? "",
    taskId: overrides.taskId,
    actionId: overrides.actionId,
    status: overrides.status,
    required: overrides.required,
    summary: overrides.summary,
    query: overrides.query,
    url: overrides.url,
    searchEngine: overrides.searchEngine,
    searchLocation: overrides.searchLocation,
    outputMode: overrides.outputMode,
    rawResultId: overrides.rawResultId,
    libraryItemId: overrides.libraryItemId,
    partIndex: overrides.partIndex,
    totalParts: overrides.totalParts,
    characters: overrides.characters,
  };
}

describe("taskProtocolRuntime", () => {
  it("resolves waiting status from user question events", () => {
    expect(
      resolveTaskExecutionStatus("running", createEvent({ type: "user_question" }))
    ).toBe("waiting_user");
  });

  it("increments search progress only on successful search_response and stores search result", () => {
    const next = applyTaskProtocolEvent(
      createRuntime(),
      createEvent({
        type: "search_response",
        taskId: "123456",
        actionId: "S001",
        body: "summary body",
        query: "napoleon",
        searchEngine: "youtube_search",
        rawResultId: "RAW-1",
      }),
      {
        direction: "kin_to_gpt",
        resolvedTaskId: "123456",
        actionId: "S001",
        now: 100,
      }
    );

    expect(
      next.requirementProgress.find((item) => item.kind === "search_request")
        ?.completedCount
    ).toBe(1);
    expect(next.completedSearches).toHaveLength(1);
    expect(next.completedSearches[0]?.query).toBe("napoleon");
  });

  it("does not increment youtube transcript progress without a library item", () => {
    const next = applyTaskProtocolEvent(
      createRuntime(),
      createEvent({
        type: "youtube_transcript_response",
        taskId: "123456",
        actionId: "Y001",
        body: "failed fetch",
      }),
      {
        direction: "kin_to_gpt",
        resolvedTaskId: "123456",
        actionId: "Y001",
        now: 100,
      }
    );

    expect(
      next.requirementProgress.find(
        (item) => item.kind === "youtube_transcript_request"
      )?.completedCount
    ).toBe(0);
  });

  it("does not increment search progress once the configured limit is reached", () => {
    const runtime = createRuntime();
    runtime.requirementProgress = runtime.requirementProgress.map((item) =>
      item.kind !== "search_request"
        ? item
        : {
            ...item,
            completedCount: 2,
            status: "done",
          }
    );

    const next = applyTaskProtocolEvent(
      runtime,
      createEvent({
        type: "search_response",
        taskId: "123456",
        actionId: "S099",
        body: "summary body",
        query: "already full",
        searchEngine: "google_search",
      }),
      {
        direction: "kin_to_gpt",
        resolvedTaskId: "123456",
        actionId: "S099",
        now: 101,
      }
    );

    expect(
      next.requirementProgress.find((item) => item.kind === "search_request")
        ?.completedCount
    ).toBe(2);
  });

  it("does not increment youtube transcript progress once the configured limit is reached", () => {
    const runtime = createRuntime();
    runtime.requirementProgress = runtime.requirementProgress.map((item) =>
      item.kind !== "youtube_transcript_request"
        ? item
        : {
            ...item,
            completedCount: 2,
            status: "done",
          }
    );

    const next = applyTaskProtocolEvent(
      runtime,
      createEvent({
        type: "youtube_transcript_response",
        taskId: "123456",
        actionId: "Y099",
        body: "ok",
        libraryItemId: "doc:123",
      }),
      {
        direction: "kin_to_gpt",
        resolvedTaskId: "123456",
        actionId: "Y099",
        now: 102,
      }
    );

    expect(
      next.requirementProgress.find(
        (item) => item.kind === "youtube_transcript_request"
      )?.completedCount
    ).toBe(2);
  });

  it("creates a pending user-facing request for user questions", () => {
    const next = applyTaskProtocolEvent(
      createRuntime(),
      createEvent({
        type: "user_question",
        taskId: "123456",
        actionId: "Q001",
        body: "Need clarification",
        required: true,
      }),
      {
        direction: "kin_to_gpt",
        resolvedTaskId: "123456",
        actionId: "Q001",
        now: 200,
      }
    );

    expect(next.pendingRequests).toHaveLength(1);
    expect(next.userFacingRequests).toHaveLength(1);
    expect(next.pendingRequests[0]?.body).toBe("Need clarification");
    expect(
      next.requirementProgress.find((item) => item.kind === "ask_user")
        ?.completedCount
    ).toBe(1);
  });

  it("marks finalize done only for non-multipart task_done", () => {
    const multipart = applyTaskProtocolEvent(
      createRuntime(),
      createEvent({
        type: "task_done",
        taskId: "123456",
        body: "part",
        partIndex: 1,
        totalParts: 2,
      }),
      {
        direction: "kin_to_gpt",
        resolvedTaskId: "123456",
        actionId: "D001",
        now: 300,
      }
    );

    const complete = applyTaskProtocolEvent(
      createRuntime(),
      createEvent({
        type: "task_done",
        taskId: "123456",
        body: "complete",
      }),
      {
        direction: "kin_to_gpt",
        resolvedTaskId: "123456",
        actionId: "D002",
        now: 301,
      }
    );

    expect(
      multipart.requirementProgress.find((item) => item.kind === "finalize")
        ?.completedCount
    ).toBe(0);
    expect(
      complete.requirementProgress.find((item) => item.kind === "finalize")
        ?.completedCount
    ).toBe(1);
  });
});
