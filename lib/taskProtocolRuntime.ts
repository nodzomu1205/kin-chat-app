import type {
  PendingExternalRequest,
  TaskExecutionStatus,
  TaskProtocolEvent,
  TaskRequirementProgress,
  TaskRuntimeState,
} from "@/types/taskProtocol";
import {
  isRequirementProgressAtLimit,
  isSuccessfulTaskArtifact,
} from "@/lib/taskProgressPolicy";
import { markRequirementProgress, toUserFacingRequests } from "@/lib/taskProgress";

export function resolveTaskExecutionStatus(
  current: TaskExecutionStatus,
  event: TaskProtocolEvent
): TaskExecutionStatus {
  if (event.type === "task_done") return "completed";
  if (event.type === "material_request") return "waiting_material";
  if (event.type === "user_question") return "waiting_user";
  if (event.type === "task_confirm") {
    const normalized = (event.status || "").toLowerCase();
    if (normalized.includes("suspend") || normalized.includes("hold")) {
      return "suspended";
    }
    if (normalized.includes("waiting_user")) return "waiting_user";
    if (normalized.includes("waiting_material")) return "waiting_material";
    if (normalized.includes("ready")) return "ready_to_resume";
    if (normalized.includes("complete") || normalized.includes("done")) return "completed";
    if (normalized.includes("run") || normalized.includes("progress")) return "running";
  }
  if (
    event.type === "task_progress" ||
    event.type === "ask_gpt" ||
    event.type === "search_request" ||
    event.type === "search_response" ||
    event.type === "youtube_transcript_request" ||
    event.type === "youtube_transcript_response"
  ) {
    return "running";
  }
  return current;
}

function getRequirementByKind(
  requirementProgress: TaskRequirementProgress[],
  kind:
    | "ask_gpt"
    | "ask_user"
    | "request_material"
    | "search_request"
    | "youtube_transcript_request"
    | "library_reference"
) {
  return requirementProgress.find((item) => item.kind === kind);
}

function appendCompletedSearch(
  state: TaskRuntimeState,
  event: TaskProtocolEvent,
  params: { resolvedTaskId: string; actionId: string; now: number }
) {
  return [
    {
      taskId: params.resolvedTaskId,
      actionId: params.actionId,
      query: event.query || "",
      searchEngine: event.searchEngine,
      searchLocation: event.searchLocation,
      mode: event.outputMode || "summary",
      rawResultId: event.rawResultId,
      resultText: event.summary || event.body || "",
      createdAt: params.now,
    },
    ...state.completedSearches,
  ].slice(0, 20);
}

function upsertPendingRequest(
  state: TaskRuntimeState,
  event: TaskProtocolEvent,
  params: { resolvedTaskId: string; actionId: string; now: number }
) {
  const kind =
    event.type === "material_request" ? "request_material" : "question";
  const target = event.type === "material_request" ? "material" : "user";
  const existingIndex = state.pendingRequests.findIndex(
    (request) => request.actionId === params.actionId
  );

  const pending: PendingExternalRequest = {
    id: event.actionId || params.actionId,
    actionId: params.actionId,
    taskId: params.resolvedTaskId,
    target,
    kind,
    body: event.body || event.summary || "",
    status: "pending",
    createdAt: params.now,
    required: event.required ?? false,
  };

  if (existingIndex >= 0) {
    const copied = [...state.pendingRequests];
    copied[existingIndex] = {
      ...copied[existingIndex],
      ...pending,
      createdAt: copied[existingIndex].createdAt,
    };
    return copied;
  }

  return [...state.pendingRequests, pending];
}

export function applyTaskProtocolEvent(
  state: TaskRuntimeState,
  event: TaskProtocolEvent,
  params: {
    direction: "kin_to_gpt" | "gpt_to_kin" | "user_to_kin" | "system";
    resolvedTaskId: string;
    actionId: string;
    now: number;
  }
) {
  const logBodyParts = [
    event.actionId ? `ACTION_ID:${event.actionId}` : "",
    event.body || event.summary || "",
  ]
    .filter(Boolean)
    .join("\n");

  const next: TaskRuntimeState = {
    ...state,
    currentTaskId: state.currentTaskId ?? params.resolvedTaskId,
    latestSummary: event.summary || event.body || state.latestSummary,
    taskStatus: resolveTaskExecutionStatus(state.taskStatus, event),
    protocolLog: [
      ...state.protocolLog,
      {
        taskId: params.resolvedTaskId,
        direction: params.direction,
        type: event.type,
        body: logBodyParts,
        createdAt: params.now,
      },
    ],
  };

  const isOverLimit = (
    kind:
      | "ask_gpt"
      | "ask_user"
      | "request_material"
      | "search_request"
      | "youtube_transcript_request"
      | "library_reference"
  ) =>
    isRequirementProgressAtLimit(
      getRequirementByKind(next.requirementProgress, kind)
    );

  if (event.type === "gpt_response") {
    if (isSuccessfulTaskArtifact(event) && !isOverLimit("ask_gpt")) {
      next.requirementProgress = markRequirementProgress(
        next.requirementProgress,
        "ask_gpt"
      );
    }
  } else if (event.type === "search_response") {
    if (isSuccessfulTaskArtifact(event) && !isOverLimit("search_request")) {
      next.requirementProgress = markRequirementProgress(
        next.requirementProgress,
        "search_request"
      );
    }
    next.completedSearches = appendCompletedSearch(next, event, params);
  } else if (event.type === "youtube_transcript_response") {
    if (event.libraryItemId && !isOverLimit("youtube_transcript_request")) {
      next.requirementProgress = markRequirementProgress(
        next.requirementProgress,
        "youtube_transcript_request"
      );
    }
  } else if (
    event.type === "library_index_response" ||
    event.type === "library_item_response"
  ) {
    if (isSuccessfulTaskArtifact(event) && !isOverLimit("library_reference")) {
      next.requirementProgress = markRequirementProgress(
        next.requirementProgress,
        "library_reference"
      );
    }
  } else if (event.type === "user_question" || event.type === "material_request") {
    const targetKind =
      event.type === "material_request" ? "request_material" : "ask_user";
    if (!isOverLimit(targetKind)) {
      next.pendingRequests = upsertPendingRequest(next, event, params);
      next.requirementProgress = markRequirementProgress(
        next.requirementProgress,
        targetKind
      );
    }
  } else if (event.type === "task_done") {
    if (
      typeof event.partIndex !== "number" ||
      typeof event.totalParts !== "number"
    ) {
      next.requirementProgress = next.requirementProgress.map((item) =>
        item.kind === "finalize"
          ? {
              ...item,
              completedCount: item.targetCount ?? 1,
              status: "done",
            }
          : item
      );
    }
  } else if (event.type === "task_confirm" && event.actionId) {
    const normalizedStatus = (event.status || "").toLowerCase();
    next.pendingRequests = next.pendingRequests.map((request) =>
      request.actionId !== event.actionId
        ? request
        : {
            ...request,
            status: normalizedStatus.includes("cancel")
              ? "cancelled"
              : normalizedStatus.includes("answer") ||
                  normalizedStatus.includes("resolved")
                ? "answered"
                : request.status,
          }
    );
  }

  next.userFacingRequests = toUserFacingRequests(next.pendingRequests);
  return next;
}
