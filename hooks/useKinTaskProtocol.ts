"use client";

import { useMemo, useState } from "react";
import type {
  PendingExternalRequest,
  TaskExecutionStatus,
  TaskIntent,
  TaskProtocolEvent,
  TaskRuntimeState,
} from "@/types/taskProtocol";
import { generateTaskTitle } from "@/lib/taskTitle";
import { compileKinTaskPrompt } from "@/lib/taskCompiler";
import {
  buildInitialRequirementProgress,
  markRequirementProgress,
  toUserFacingRequests,
} from "@/lib/taskProgress";
import {
  buildTaskConfirmBlock,
  buildWaitingAckBlock,
} from "@/lib/taskRuntimeProtocol";

function createTaskId() {
  return String(Date.now()).slice(-6);
}

export function useKinTaskProtocol() {
  const [runtime, setRuntime] = useState<TaskRuntimeState>({
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
  });

  function createActionId() {
    return `A${String(Date.now()).slice(-6)}`;
  }

  function resolveStatusFromEvent(
    current: TaskExecutionStatus,
    event: TaskProtocolEvent
  ): TaskExecutionStatus {
    if (event.type === "task_done") return "completed";
    if (event.type === "material_request") return "waiting_material";
    if (event.type === "user_question") return "waiting_user";
    if (event.type === "task_confirm") {
      const normalized = (event.status || "").toLowerCase();
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
      event.type === "search_response"
    ) {
      return "running";
    }
    return current;
  }

  function startTask(params: {
    originalInstruction: string;
    intent: TaskIntent;
  }) {
    const taskId = createTaskId();
    const title = generateTaskTitle({
      goal: params.intent.goal,
      outputType: params.intent.output.type,
      entities: params.intent.entities,
    });

    const compiled = compileKinTaskPrompt({
      taskId,
      title,
      originalInstruction: params.originalInstruction,
      intent: params.intent,
    });

    const requirementProgress = buildInitialRequirementProgress(params.intent);

    setRuntime((prev) => ({
      ...prev,
      currentTaskId: taskId,
      currentTaskTitle: title,
      currentTaskIntent: params.intent,
      compiledTaskPrompt: compiled,
      taskStatus: "running",
      latestSummary: params.intent.goal,
      requirementProgress,
      pendingRequests: [],
      userFacingRequests: [],
      protocolLog: [
        ...prev.protocolLog,
        {
          taskId,
          direction: "system",
          type: "task_started",
          body: params.intent.goal,
          createdAt: Date.now(),
        },
      ],
    }));

    return {
      taskId,
      title,
      compiledTaskPrompt: compiled,
    };
  }

  function addPendingRequest(request: Omit<PendingExternalRequest, "createdAt" | "status">) {
    setRuntime((prev) => {
      const pending: PendingExternalRequest = {
        ...request,
        createdAt: Date.now(),
        status: "pending",
      };
      const nextPending = [...prev.pendingRequests, pending];
      return {
        ...prev,
        pendingRequests: nextPending,
        userFacingRequests: toUserFacingRequests(nextPending),
      };
    });
  }

  function answerPendingRequest(requestId: string, answerText: string) {
    setRuntime((prev) => {
      const nextPending = prev.pendingRequests.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: "answered" as const,
              answeredAt: Date.now(),
              answerText,
            }
          : r
      );

      return {
        ...prev,
        taskStatus: "ready_to_resume",
        pendingRequests: nextPending,
        userFacingRequests: toUserFacingRequests(nextPending),
      };
    });
  }

  function ingestProtocolEvents(params: {
    text: string;
    direction: "kin_to_gpt" | "gpt_to_kin" | "user_to_kin" | "system";
    events: TaskProtocolEvent[];
  }) {
    if (params.events.length === 0) return;

    setRuntime((prev) => {
      let next = { ...prev };

      for (const event of params.events) {
        const resolvedTaskId =
          event.taskId || next.currentTaskId || prev.currentTaskId || "";
        const actionId = event.actionId || createActionId();
        const existingLog = next.protocolLog.find((entry) => {
          if (entry.taskId !== resolvedTaskId || entry.type !== event.type) return false;
          if (event.actionId) {
            return entry.body.includes(event.actionId);
          }
          return entry.body === (event.body || event.summary || "");
        });

        if (existingLog) {
          continue;
        }
        const logBodyParts = [event.actionId ? `ACTION_ID:${event.actionId}` : "", event.body || event.summary || ""]
          .filter(Boolean)
          .join("\n");

        next = {
          ...next,
          currentTaskId: next.currentTaskId ?? resolvedTaskId,
          latestSummary: event.summary || event.body || next.latestSummary,
          taskStatus: resolveStatusFromEvent(next.taskStatus, event),
          protocolLog: [
            ...next.protocolLog,
            {
              taskId: resolvedTaskId,
              direction: params.direction,
              type: event.type,
              body: logBodyParts,
              createdAt: Date.now(),
            },
          ],
        };

        const getRequirement = (
          kind: "ask_gpt" | "ask_user" | "request_material" | "search_request"
        ) => next.requirementProgress.find((item) => item.kind === kind);
        const isOverLimit = (
          kind: "ask_gpt" | "ask_user" | "request_material" | "search_request"
        ) => {
          const requirement = getRequirement(kind);
          if (!requirement || typeof requirement.targetCount !== "number") return false;
          return (requirement.completedCount ?? 0) >= requirement.targetCount;
        };

        if (event.type === "ask_gpt") {
          if (isOverLimit("ask_gpt")) continue;
          next.requirementProgress = markRequirementProgress(
            next.requirementProgress,
            "ask_gpt"
          );
          continue;
        }

        if (event.type === "gpt_response") {
          continue;
        }

        if (event.type === "search_request") {
          if (isOverLimit("search_request")) continue;
          next.requirementProgress = markRequirementProgress(
            next.requirementProgress,
            "search_request"
          );
          continue;
        }

        if (event.type === "search_response") {
          next.completedSearches = [
            {
              taskId: resolvedTaskId,
              actionId,
              query: event.query || "",
              mode: event.outputMode || "summary",
              rawResultId: event.rawResultId,
              resultText: event.summary || event.body || "",
              createdAt: Date.now(),
            },
            ...next.completedSearches,
          ].slice(0, 20);
          continue;
        }

        if (event.type === "user_question" || event.type === "material_request") {
          const targetKind =
            event.type === "material_request" ? "request_material" : "ask_user";
          if (isOverLimit(targetKind)) continue;

          const kind =
            event.type === "material_request" ? "request_material" : "question";
          const target = event.type === "material_request" ? "material" : "user";
          const existingIndex = next.pendingRequests.findIndex(
            (request) => request.actionId === actionId
          );

          const pending: PendingExternalRequest = {
            id: event.actionId || actionId,
            actionId,
            taskId: resolvedTaskId,
            target,
            kind,
            body: event.body || event.summary || "",
            status: "pending",
            createdAt: Date.now(),
            required: event.required ?? false,
          };

          if (existingIndex >= 0) {
            const copied = [...next.pendingRequests];
            copied[existingIndex] = {
              ...copied[existingIndex],
              ...pending,
              createdAt: copied[existingIndex].createdAt,
            };
            next.pendingRequests = copied;
          } else {
            next.pendingRequests = [...next.pendingRequests, pending];
          }

          next.requirementProgress = markRequirementProgress(
            next.requirementProgress,
            targetKind
          );
          next.userFacingRequests = toUserFacingRequests(next.pendingRequests);
          continue;
        }

        if (event.type === "task_done") {
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

        if (event.type === "task_confirm" && event.actionId) {
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
      }

      next.userFacingRequests = toUserFacingRequests(next.pendingRequests);
      return next;
    });
  }

  function prepareTaskSyncMessage(note?: string) {
    return buildTaskConfirmBlock(runtime, note);
  }

  function prepareWaitingAckMessage(requestId: string) {
    const request = runtime.pendingRequests.find((item) => item.id === requestId);
    if (!request) return null;
    return buildWaitingAckBlock(request);
  }

  const progressView = useMemo(() => {
    return {
      taskId: runtime.currentTaskId,
      taskTitle: runtime.currentTaskTitle,
      goal: runtime.currentTaskIntent?.goal ?? "",
      taskStatus: runtime.taskStatus,
      latestSummary: runtime.latestSummary,
      requirementProgress: runtime.requirementProgress,
      userFacingRequests: runtime.userFacingRequests,
    };
  }, [runtime]);

  return {
    runtime,
    progressView,
    startTask,
    addPendingRequest,
    answerPendingRequest,
    ingestProtocolEvents,
    prepareTaskSyncMessage,
    prepareWaitingAckMessage,
  };
}
