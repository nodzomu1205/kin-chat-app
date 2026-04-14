"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  PendingExternalRequest,
  TaskIntent,
  TaskProtocolEvent,
  TaskRuntimeState,
} from "@/types/taskProtocol";
import {
  buildTaskProgressView,
  getTaskProgressSelection,
  removeTaskRuntimeSnapshot,
  upsertTaskRuntimeSnapshot,
} from "@/lib/taskRuntimeCollection";
import { toUserFacingRequests } from "@/lib/taskProgress";
import { ingestTaskProtocolEventsState } from "@/lib/taskProtocolIngest";
import {
  answerPendingTaskRequestState,
  applyFinalizeReviewedState,
  updateRequirementProgressCountsState,
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
  buildTaskSuspendBlock,
  buildWaitingAckBlock,
} from "@/lib/taskRuntimeProtocol";

function createTaskId() {
  return String(Date.now()).slice(-6);
}

export function useKinTaskProtocol() {
  const [runtime, setRuntime] = useState<TaskRuntimeState>(createEmptyTaskRuntime);
  const [runtimeSnapshots, setRuntimeSnapshots] = useState<TaskRuntimeState[]>([]);

  useEffect(() => {
    if (!runtime.currentTaskId) return;
    setRuntimeSnapshots((prev) => upsertTaskRuntimeSnapshot(prev, runtime));
  }, [runtime]);

  function createActionId() {
    return `A${String(Date.now()).slice(-6)}`;
  }

  function startTask(params: {
    originalInstruction: string;
    intent: TaskIntent;
  }) {
    const taskId = createTaskId();
    const started = buildStartedTaskState({
      prev: createEmptyTaskRuntime(),
      taskId,
      originalInstruction: params.originalInstruction,
      intent: params.intent,
      now: Date.now(),
    });
    setRuntime(started.nextState);

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

  function updateRequirementProgressCounts(params: {
    requirementId: string;
    completedCount: number;
    targetCount?: number;
  }) {
    setRuntime((prev) => updateRequirementProgressCountsState(prev, params));
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

  function prepareTaskSuspendMessage(note?: string) {
    return buildTaskSuspendBlock(runtime, note);
  }

  function prepareWaitingAckMessage(requestId: string) {
    const request = runtime.pendingRequests.find((item) => item.id === requestId);
    if (!request) return null;
    return buildWaitingAckBlock(request);
  }

  function resetRuntime() {
    setRuntime(createEmptyTaskRuntime());
  }

  function archiveTask(taskId: string) {
    setRuntimeSnapshots((prev) => {
      const nextSnapshots = removeTaskRuntimeSnapshot(prev, taskId);
      setRuntime((currentRuntime) => {
        if (currentRuntime.currentTaskId !== taskId) return currentRuntime;
        return nextSnapshots[0] || createEmptyTaskRuntime();
      });
      return nextSnapshots;
    });
  }

  const progressViews = useMemo(
    () => runtimeSnapshots.map((snapshot) => buildTaskProgressView(snapshot)),
    [runtimeSnapshots]
  );

  const progressSelection = useMemo(
    () => getTaskProgressSelection(runtimeSnapshots, runtime.currentTaskId),
    [runtimeSnapshots, runtime.currentTaskId]
  );

  const progressView =
    progressViews[progressSelection.activeIndex] ||
    buildTaskProgressView(createEmptyTaskRuntime());

  function selectPreviousProgressView() {
    if (progressSelection.activeIndex <= 0) return;
    const nextRuntime = runtimeSnapshots[progressSelection.activeIndex - 1];
    if (!nextRuntime) return;
    setRuntime(nextRuntime);
  }

  function selectNextProgressView() {
    const nextRuntime = runtimeSnapshots[progressSelection.activeIndex + 1];
    if (!nextRuntime) return;
    setRuntime(nextRuntime);
  }

  return {
    runtime,
    progressView,
    progressViews,
    activeProgressIndex: progressSelection.activeIndex,
    startTask,
    replaceCurrentTaskIntent,
    addPendingRequest,
    answerPendingRequest,
    setFinalizeReviewed,
    updateRequirementProgressCounts,
    ingestProtocolEvents,
    prepareTaskSyncMessage,
    prepareTaskSuspendMessage,
    prepareWaitingAckMessage,
    selectPreviousProgressView,
    selectNextProgressView,
    archiveTask,
    resetRuntime,
  };
}
