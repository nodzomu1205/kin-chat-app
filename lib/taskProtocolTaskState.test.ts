import { describe, expect, it } from "vitest";
import {
  buildReplacedTaskIntentState,
  buildStartedTaskState,
} from "@/lib/taskProtocolTaskState";
import type { TaskIntent, TaskRuntimeState } from "@/types/taskProtocol";

function createRuntime(overrides: Partial<TaskRuntimeState> = {}): TaskRuntimeState {
  return {
    currentTaskId: null,
    currentTaskTitle: "",
    currentTaskIntent: null,
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
  entities: ["りすこ"],
};

describe("taskProtocolTaskState", () => {
  it("builds a started task state with compiled prompt and log", () => {
    const result = buildStartedTaskState({
      prev: createRuntime(),
      taskId: "123456",
      originalInstruction: "Analyze rivals",
      intent: baseIntent,
      now: 1000,
    });

    expect(result.title).toBeTruthy();
    expect(result.compiledTaskPrompt).toContain("<<SYS_TASK>>");
    expect(result.nextState.currentTaskId).toBe("123456");
    expect(result.nextState.taskStatus).toBe("running");
    expect(result.nextState.protocolLog).toHaveLength(1);
  });

  it("derives a clearer Japanese title from the original instruction", () => {
    const intent: TaskIntent = {
      ...baseIntent,
      goal: "縄文時代に関する動画をYouTubeで最低3つ見つけて分析してレポートを提出して",
      entities: [],
    };

    const result = buildStartedTaskState({
      prev: createRuntime(),
      taskId: "123456",
      originalInstruction:
        "縄文時代に関する動画をYouTubeで最低3つ見つけて分析してレポートを提出して！1000文字以上。検索3回迄。コンテンツ取得5回迄。",
      intent,
      now: 1000,
    });

    expect(result.title).toContain("縄文時代");
    expect(result.title).toContain("YouTube");
    expect(result.title).not.toBe("縄文時代に関する動画をYouTube");
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
  });
});
