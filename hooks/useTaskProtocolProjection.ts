"use client";

import { useMemo } from "react";
import type { useKinTaskProtocol } from "@/hooks/useKinTaskProtocol";
import { createProtocolEventIngestor } from "@/lib/app/protocolEventIngest";

type TaskProtocolController = ReturnType<typeof useKinTaskProtocol>;

export function useTaskProtocolProjection(taskProtocol: TaskProtocolController) {
  const ingestProtocolMessage = useMemo(
    () => createProtocolEventIngestor(taskProtocol.ingestProtocolEvents),
    [taskProtocol.ingestProtocolEvents]
  );

  return {
    currentTaskId: taskProtocol.runtime.currentTaskId || undefined,
    currentTaskTitle: taskProtocol.runtime.currentTaskTitle || undefined,
    currentTaskIntentConstraints:
      taskProtocol.runtime.currentTaskIntent?.constraints || [],
    pendingRequests: taskProtocol.runtime.pendingRequests,
    progressView: taskProtocol.progressView,
    progressViews: taskProtocol.progressViews,
    activeProgressIndex: taskProtocol.activeProgressIndex,
    setFinalizeReviewed: taskProtocol.setFinalizeReviewed,
    onUpdateTaskProgressCounts: taskProtocol.updateRequirementProgressCounts,
    onClearTaskProgress: taskProtocol.archiveTask,
    onSelectPreviousTaskProgress: taskProtocol.selectPreviousProgressView,
    onSelectNextTaskProgress: taskProtocol.selectNextProgressView,
    resetRuntime: taskProtocol.resetRuntime,
    ingestProtocolMessage,
  };
}
