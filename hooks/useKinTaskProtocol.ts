"use client";

import { useMemo, useState } from "react";
import type {
  PendingExternalRequest,
  TaskIntent,
  TaskRuntimeState,
} from "@/types/taskProtocol";
import { generateTaskTitle } from "@/lib/taskTitle";
import { compileKinTaskPrompt } from "@/lib/taskCompiler";
import {
  buildInitialRequirementProgress,
  toUserFacingRequests,
} from "@/lib/taskProgress";

function createTaskId() {
  return String(Date.now()).slice(-6);
}

export function useKinTaskProtocol() {
  const [runtime, setRuntime] = useState<TaskRuntimeState>({
    currentTaskId: null,
    currentTaskTitle: "",
    currentTaskIntent: null,
    compiledTaskPrompt: "",
    requirementProgress: [],
    pendingRequests: [],
    userFacingRequests: [],
    completedSearches: [],
    protocolLog: [],
  });

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
        pendingRequests: nextPending,
        userFacingRequests: toUserFacingRequests(nextPending),
      };
    });
  }

  const progressView = useMemo(() => {
    return {
      taskId: runtime.currentTaskId,
      taskTitle: runtime.currentTaskTitle,
      goal: runtime.currentTaskIntent?.goal ?? "",
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
  };
}