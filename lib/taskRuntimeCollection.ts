import type { TaskProgressView } from "@/components/panels/gpt/gptPanelTypes";
import type { TaskRuntimeState } from "@/types/taskProtocol";

export function upsertTaskRuntimeSnapshot(
  snapshots: TaskRuntimeState[],
  runtime: TaskRuntimeState
) {
  if (!runtime.currentTaskId) return snapshots;

  const nextSnapshots = snapshots.filter(
    (snapshot) => snapshot.currentTaskId !== runtime.currentTaskId
  );

  return [runtime, ...nextSnapshots];
}

export function removeTaskRuntimeSnapshot(
  snapshots: TaskRuntimeState[],
  taskId: string | null | undefined
) {
  if (!taskId) return snapshots;
  return snapshots.filter((snapshot) => snapshot.currentTaskId !== taskId);
}

export function hasTaskRuntimeSnapshot(
  snapshots: TaskRuntimeState[],
  taskId: string | null | undefined
) {
  if (!taskId) return false;
  return snapshots.some((snapshot) => snapshot.currentTaskId === taskId);
}

export function buildTaskProgressView(runtime: TaskRuntimeState): TaskProgressView {
  return {
    taskId: runtime.currentTaskId,
    taskTitle: runtime.currentTaskTitle,
    goal: runtime.currentTaskIntent?.goal ?? "",
    taskStatus: runtime.taskStatus,
    latestSummary: runtime.latestSummary,
    requirementProgress: runtime.requirementProgress,
    userFacingRequests: runtime.userFacingRequests,
  };
}

export function getTaskProgressSelection(
  snapshots: TaskRuntimeState[],
  activeTaskId: string | null
) {
  const activeIndex = snapshots.findIndex(
    (snapshot) => snapshot.currentTaskId === activeTaskId
  );

  return {
    activeIndex: activeIndex >= 0 ? activeIndex : 0,
    totalCount: snapshots.length,
  };
}
