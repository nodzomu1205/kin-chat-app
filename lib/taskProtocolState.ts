import { buildInitialRequirementProgress } from "@/lib/taskProgress";
import type {
  TaskIntent,
  TaskRequirementProgress,
  TaskRuntimeState,
} from "@/types/taskProtocol";

export function createEmptyTaskRuntime(): TaskRuntimeState {
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
  };
}

export function mergeRequirementProgressForIntent(
  currentRequirementProgress: TaskRequirementProgress[],
  intent: TaskIntent
) {
  const nextRequirements = buildInitialRequirementProgress(intent);
  return nextRequirements.map((item) => {
    const existing = currentRequirementProgress.find(
      (current) => current.kind === item.kind
    );
    if (!existing) return item;
    const completedCount = existing.completedCount ?? 0;
    const targetCount = item.targetCount;
    const status =
      typeof targetCount === "number" && completedCount >= targetCount
        ? "done"
        : completedCount > 0
          ? "in_progress"
          : item.status;
    return {
      ...item,
      completedCount,
      status,
    };
  });
}
