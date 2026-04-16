"use client";

import { useEffect } from "react";

type TaskResultDocument = {
  artifactType?: string;
  taskId?: string | null;
};

type ProgressView = {
  taskId?: string | null;
};

type UseArchiveCompletedTaskResultsArgs = {
  documents: TaskResultDocument[];
  progressViews: ProgressView[];
  archiveTask: (taskId: string) => void;
};

export function useArchiveCompletedTaskResults(
  args: UseArchiveCompletedTaskResultsArgs
) {
  useEffect(() => {
    const completedTaskIds = args.documents
      .filter(
        (document) =>
          document.artifactType === "task_result" && !!document.taskId
      )
      .map((document) => document.taskId as string);

    if (completedTaskIds.length === 0) return;

    const activeTaskIds = new Set(
      args.progressViews
        .map((view) => view.taskId)
        .filter((taskId): taskId is string => !!taskId)
    );

    completedTaskIds.forEach((taskId) => {
      if (activeTaskIds.has(taskId)) {
        args.archiveTask(taskId);
      }
    });
  }, [args]);
}
