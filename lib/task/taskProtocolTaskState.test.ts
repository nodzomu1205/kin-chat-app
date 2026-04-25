import { describe, expect, it } from "vitest";
import {
  buildReplacedTaskIntentState,
  buildStartedTaskState,
  resolveTaskRecompileSourceInstruction,
} from "@/lib/task/taskProtocolTaskState";
import type { TaskIntent, TaskRuntimeState } from "@/types/taskProtocol";

function createRuntime(overrides: Partial<TaskRuntimeState> = {}): TaskRuntimeState {
  return {
    currentTaskId: null,
    currentTaskTitle: "",
    currentTaskIntent: null,
    originalInstruction: "",
    compiledTaskPrompt: "",
    taskStatus: "idle",
    latestSummary: "",
    requirementProgress: [],
    pendingRequests: [],
    userFacingRequests: [],
    completedSearches: [],
    protocolLog: [],
    ...overrides,
  };
}

const baseIntent: TaskIntent = {
  mode: "task",
  goal: "Analyze rivals",
  output: {
    type: "essay",
    language: "ja",
  },
  workflow: {
    allowSearchRequest: true,
    searchRequestCount: 3,
    searchRequestCountRule: "up_to",
    finalizationPolicy: "auto_when_ready",
  },
  constraints: [],
  entities: ["rivals"],
};

describe("taskProtocolTaskState", () => {
  it("prefers original instruction for task recompile input", () => {
    expect(
      resolveTaskRecompileSourceInstruction({
        originalInstruction: "  original instruction  ",
        draftUserInstruction: "draft instruction",
        intentGoal: "goal",
      })
    ).toBe("original instruction");
  });

  it("falls back from draft instruction to goal when the runtime copy is empty", () => {
    expect(
      resolveTaskRecompileSourceInstruction({
        originalInstruction: "   ",
        draftUserInstruction: "  draft instruction  ",
        intentGoal: "goal",
      })
    ).toBe("draft instruction");

    expect(
      resolveTaskRecompileSourceInstruction({
        originalInstruction: "",
        draftUserInstruction: " ",
        intentGoal: "  goal  ",
      })
    ).toBe("goal");
  });

  it("builds a started task state without inventing a title", () => {
    const result = buildStartedTaskState({
      prev: createRuntime(),
      taskId: "123456",
      originalInstruction: "Analyze rivals",
      intent: baseIntent,
      now: 1000,
    });

    expect(result.title).toBe("");
    expect(result.compiledTaskPrompt).toContain("<<SYS_TASK>>");
    expect(result.compiledTaskPrompt).not.toContain("TITLE:");
    expect(result.nextState.currentTaskId).toBe("123456");
    expect(result.nextState.taskStatus).toBe("running");
    expect(result.nextState.originalInstruction).toBe("Analyze rivals");
    expect(result.nextState.protocolLog).toHaveLength(1);
  });

  it("preserves prior progress when replacing the current task intent", () => {
    const prev = createRuntime({
      currentTaskId: "123456",
      currentTaskTitle: "Old title",
      requirementProgress: [
        {
          id: "search_request",
          label: "Search",
          category: "optional",
          kind: "search_request",
          targetCount: 3,
          completedCount: 2,
          status: "in_progress",
        },
      ],
    });

    const result = buildReplacedTaskIntentState({
      prev,
      taskId: "123456",
      intent: baseIntent,
    });

    expect(result.title).toBe("Old title");
    expect(result.nextState.requirementProgress[0]?.completedCount).toBe(2);
    expect(result.nextState.latestSummary).toBe("Analyze rivals");
    expect(result.nextState.originalInstruction).toBe("");
  });
});
