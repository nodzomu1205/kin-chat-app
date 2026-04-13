"use client";

import { useMemo, useState } from "react";
import type {
  PendingExternalRequest,
  TaskIntent,
  TaskProtocolEvent,
  TaskRuntimeState,
} from "@/types/taskProtocol";
import { toUserFacingRequests } from "@/lib/taskProgress";
import { ingestTaskProtocolEventsState } from "@/lib/taskProtocolIngest";
import {
  answerPendingTaskRequestState,
  applyFinalizeReviewedState,
} from "@/lib/taskProtocolMutations";
import {
  createEmptyTaskRuntime,
} from "@/lib/taskProtocolState";
import {
  buildReplacedTaskIntentState,
  buildStartedTaskState,
} from "@/lib/taskProtocolTaskState";
import {
  buildTaskConfirmBlock,
  buildWaitingAckBlock,
} from "@/lib/taskRuntimeProtocol";

function createTaskId() {
  return String(Date.now()).slice(-6);
}

export function useKinTaskProtocol() {
  const [runtime, setRuntime] = useState<TaskRuntimeState>(createEmptyTaskRuntime);

  function createActionId() {
    return `A${String(Date.now()).slice(-6)}`;
  }

  function startTask(params: {
    originalInstruction: string;
    intent: TaskIntent;
  }) {
    const taskId = createTaskId();

    setRuntime((prev) => ({
      ...buildStartedTaskState({
        prev,
        taskId,
        originalInstruction: params.originalInstruction,
        intent: params.intent,
        now: Date.now(),
      }).nextState,
    }));

    const started = buildStartedTaskState({
      prev: createEmptyTaskRuntime(),
      taskId,
      originalInstruction: params.originalInstruction,
      intent: params.intent,
      now: Date.now(),
    });

    return {
      taskId,
      title: started.title,
      compiledTaskPrompt: started.compiledTaskPrompt,
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

  function replaceCurrentTaskIntent(params: {
    intent: TaskIntent;
    title?: string;
    originalInstruction?: string;
  }) {
    if (!runtime.currentTaskId) return null;

    const taskId = runtime.currentTaskId;
    const next = buildReplacedTaskIntentState({
      prev: runtime,
      taskId,
      intent: params.intent,
      title: params.title,
      originalInstruction: params.originalInstruction,
    });

    setRuntime((prev) => ({
      ...prev,
      ...next.nextState,
    }));

    return {
      taskId,
      title: next.title,
      compiledTaskPrompt: next.compiledTaskPrompt,
    };
  }

  function answerPendingRequest(requestId: string, answerText: string) {
    setRuntime((prev) =>
      answerPendingTaskRequestState(prev, {
        requestId,
        answerText,
        answeredAt: Date.now(),
      })
    );
  }

  function setFinalizeReviewed(params: { accepted: boolean; summary?: string }) {
    setRuntime((prev) => applyFinalizeReviewedState(prev, params));
  }

  function ingestProtocolEvents(params: {
    text: string;
    direction: "kin_to_gpt" | "gpt_to_kin" | "user_to_kin" | "system";
    events: TaskProtocolEvent[];
  }) {
    if (params.events.length === 0) return;

    setRuntime((prev) => {
      return ingestTaskProtocolEventsState(prev, {
        direction: params.direction,
        events: params.events,
        createActionId,
        now: () => Date.now(),
      });
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

  function resetRuntime() {
    setRuntime(createEmptyTaskRuntime());
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
    replaceCurrentTaskIntent,
    addPendingRequest,
    answerPendingRequest,
    setFinalizeReviewed,
    ingestProtocolEvents,
    prepareTaskSyncMessage,
    prepareWaitingAckMessage,
    resetRuntime,
  };
}
