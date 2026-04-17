"use client";

import { useMemo, useState } from "react";
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
  resolveRuntimeAfterArchive,
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

  function createActionId() {
    return `A${String(Date.now()).slice(-6)}`;
  }

  function commitRuntimeState(nextState: TaskRuntimeState) {
    setRuntime(nextState);
    setRuntimeSnapshots((prev) => upsertTaskRuntimeSnapshot(prev, nextState));
  }

  function mutateRuntimeState(
    updater: (currentRuntime: TaskRuntimeState) => TaskRuntimeState
  ) {
    setRuntime((prev) => {
      const nextState = updater(prev);
      setRuntimeSnapshots((current) => upsertTaskRuntimeSnapshot(current, nextState));
      return nextState;
    });
  }

  function startTask(params: {
    originalInstruction: string;
    intent: TaskIntent;
    title?: string;
  }) {
    const taskId = createTaskId();
    const started = buildStartedTaskState({
      prev: createEmptyTaskRuntime(),
      taskId,
      originalInstruction: params.originalInstruction,
      intent: params.intent,
      title: params.title,
      now: Date.now(),
    });
    commitRuntimeState(started.nextState);

    return {
      taskId,
      title: started.title,
      compiledTaskPrompt: started.compiledTaskPrompt,
    };
  }

  function addPendingRequest(request: Omit<PendingExternalRequest, "createdAt" | "status">) {
    mutateRuntimeState((prev) => {
      const pending: PendingExternalRequest = {
        ...request,
        createdAt: Date.now(),
        status: "pending",
      };
      const nextPending = [...prev.pendingRequests, pending];
      const nextState = {
        ...prev,
        pendingRequests: nextPending,
        userFacingRequests: toUserFacingRequests(nextPending),
      };
      return nextState;
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

    const nextState = {
      ...runtime,
      ...next.nextState,
    };

    commitRuntimeState(nextState);

    return {
      taskId,
      title: next.title,
      compiledTaskPrompt: next.compiledTaskPrompt,
    };
  }

  function answerPendingRequest(requestId: string, answerText: string) {
    mutateRuntimeState((prev) =>
      answerPendingTaskRequestState(prev, {
        requestId,
        answerText,
        answeredAt: Date.now(),
      })
    );
  }

  function setFinalizeReviewed(params: { accepted: boolean; summary?: string }) {
    mutateRuntimeState((prev) => applyFinalizeReviewedState(prev, params));
  }

  function updateRequirementProgressCounts(params: {
    requirementId: string;
    completedCount: number;
    targetCount?: number;
  }) {
    mutateRuntimeState((prev) => updateRequirementProgressCountsState(prev, params));
  }

  function ingestProtocolEvents(params: {
    text: string;
    direction: "kin_to_gpt" | "gpt_to_kin" | "user_to_kin" | "system";
    events: TaskProtocolEvent[];
  }) {
    if (params.events.length === 0) return;

    mutateRuntimeState((prev) =>
      ingestTaskProtocolEventsState(prev, {
        direction: params.direction,
        events: params.events,
        createActionId,
        now: () => Date.now(),
      })
    );
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
    const nextState = createEmptyTaskRuntime();
    commitRuntimeState(nextState);
  }

  function archiveTask(taskId: string) {
    setRuntimeSnapshots((prev) => {
      const nextSnapshots = removeTaskRuntimeSnapshot(prev, taskId);
      setRuntime((currentRuntime) => {
        return resolveRuntimeAfterArchive({
          currentRuntime,
          nextSnapshots,
          archivedTaskId: taskId,
          createEmptyTaskRuntime,
        });
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
    commitRuntimeState(nextRuntime);
  }

  function selectNextProgressView() {
    const nextRuntime = runtimeSnapshots[progressSelection.activeIndex + 1];
    if (!nextRuntime) return;
    commitRuntimeState(nextRuntime);
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
