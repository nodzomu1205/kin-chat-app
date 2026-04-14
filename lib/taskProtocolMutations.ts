import { toUserFacingRequests } from "@/lib/taskProgress";
import type { TaskRuntimeState } from "@/types/taskProtocol";

export function answerPendingTaskRequestState(
  prev: TaskRuntimeState,
  params: { requestId: string; answerText: string; answeredAt: number }
): TaskRuntimeState {
  const nextPending = prev.pendingRequests.map((request) =>
    request.id === params.requestId
      ? {
          ...request,
          status: "answered" as const,
          answeredAt: params.answeredAt,
          answerText: params.answerText,
        }
      : request
  );

  return {
    ...prev,
    taskStatus: "ready_to_resume",
    pendingRequests: nextPending,
    userFacingRequests: toUserFacingRequests(nextPending),
  };
}

export function applyFinalizeReviewedState(
  prev: TaskRuntimeState,
  params: { accepted: boolean; summary?: string }
): TaskRuntimeState {
  return {
    ...prev,
    latestSummary: params.summary || prev.latestSummary,
    taskStatus: params.accepted ? "completed" : "running",
    requirementProgress: prev.requirementProgress.map((item) =>
      item.kind !== "finalize"
        ? item
        : {
            ...item,
            completedCount: params.accepted ? item.targetCount ?? 1 : 0,
            status: params.accepted ? "done" : "in_progress",
          }
    ),
  };
}

export function updateRequirementProgressCountsState(
  prev: TaskRuntimeState,
  params: {
    requirementId: string;
    completedCount: number;
    targetCount?: number;
  }
): TaskRuntimeState {
  return {
    ...prev,
    requirementProgress: prev.requirementProgress.map((item) => {
      if (item.id !== params.requirementId) return item;
      const nextCompleted = Math.max(0, params.completedCount);
      const nextTarget =
        typeof params.targetCount === "number"
          ? Math.max(0, params.targetCount)
          : item.targetCount;
      const normalizedTarget = typeof nextTarget === "number" ? nextTarget : 1;
      return {
        ...item,
        completedCount: nextCompleted,
        targetCount: nextTarget,
        status:
          nextCompleted >= normalizedTarget
            ? "done"
            : nextCompleted > 0
              ? "in_progress"
              : "not_started",
      };
    }),
  };
}
