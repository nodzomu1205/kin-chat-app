import { describe, expect, it } from "vitest";
import {
  buildTaskProgressView,
  getTaskProgressSelection,
  hasTaskRuntimeSnapshot,
  removeTaskRuntimeSnapshot,
  resolveRuntimeAfterArchive,
  upsertTaskRuntimeSnapshot,
} from "@/lib/taskRuntimeCollection";
import type { TaskRuntimeState } from "@/types/taskProtocol";

function createRuntime(
  taskId: string,
  overrides: Partial<TaskRuntimeState> = {}
): TaskRuntimeState {
  return {
    currentTaskId: taskId,
    currentTaskTitle: `Task ${taskId}`,
    currentTaskIntent: null,
    originalInstruction: "",
    compiledTaskPrompt: "",
    taskStatus: "running",
    latestSummary: "",
    requirementProgress: [],
    pendingRequests: [],
    userFacingRequests: [],
    completedSearches: [],
    protocolLog: [],
    ...overrides,
  };
}

describe("taskRuntimeCollection", () => {
  it("upserts snapshots to the front", () => {
    const first = createRuntime("001");
    const second = createRuntime("002");
    const next = upsertTaskRuntimeSnapshot(
      upsertTaskRuntimeSnapshot([], first),
      second
    );
    expect(next.map((item) => item.currentTaskId)).toEqual(["002", "001"]);
  });

  it("removes a completed snapshot", () => {
    const snapshots = [createRuntime("001"), createRuntime("002")];
    expect(removeTaskRuntimeSnapshot(snapshots, "001")).toHaveLength(1);
    expect(hasTaskRuntimeSnapshot(snapshots, "002")).toBe(true);
  });

  it("builds a progress view and selection", () => {
    const suspended = createRuntime("002", { taskStatus: "suspended" });
    const view = buildTaskProgressView(suspended);
    const selection = getTaskProgressSelection(
      [createRuntime("001"), suspended],
      "002"
    );
    expect(view.taskId).toBe("002");
    expect(view.taskStatus).toBe("suspended");
    expect(selection.activeIndex).toBe(1);
    expect(selection.totalCount).toBe(2);
  });

  it("keeps the current runtime when archiving a different task", () => {
    const currentRuntime = createRuntime("002");
    const nextSnapshots = [createRuntime("001")];

    expect(
      resolveRuntimeAfterArchive({
        currentRuntime,
        nextSnapshots,
        archivedTaskId: "001",
        createEmptyTaskRuntime: () => createRuntime("empty"),
      })
    ).toBe(currentRuntime);
  });

  it("falls back to the next snapshot or an empty runtime when archiving the active task", () => {
    const currentRuntime = createRuntime("002");

    expect(
      resolveRuntimeAfterArchive({
        currentRuntime,
        nextSnapshots: [createRuntime("001")],
        archivedTaskId: "002",
        createEmptyTaskRuntime: () => createRuntime("empty"),
      }).currentTaskId
    ).toBe("001");

    expect(
      resolveRuntimeAfterArchive({
        currentRuntime,
        nextSnapshots: [],
        archivedTaskId: "002",
        createEmptyTaskRuntime: () => createRuntime("empty"),
      }).currentTaskId
    ).toBe("empty");
  });
});
