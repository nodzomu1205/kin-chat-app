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
