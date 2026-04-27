import type { TaskDraft } from "@/types/task";
import { resolveTaskRecompileSourceInstruction } from "@/lib/task/taskProtocolTaskState";

export type TaskDraftProtocolProjectionParams = {
  taskId: string;
  title: string;
  goal: string;
  compiledTaskPrompt: string;
  originalInstruction?: string;
};

export function resolveTaskDraftUserInstruction(params: {
  originalInstruction?: string | null;
  goal?: string | null;
}) {
  return resolveTaskRecompileSourceInstruction({
    originalInstruction: params.originalInstruction,
    intentGoal: params.goal,
  });
}

export function buildTaskDraftProjectionFromProtocol(
  draft: TaskDraft,
  params: TaskDraftProtocolProjectionParams
): TaskDraft {
  const userInstruction = resolveTaskDraftUserInstruction({
    originalInstruction: params.originalInstruction,
    goal: params.goal,
  });

  return {
    ...draft,
    taskId: params.taskId,
    title: params.title,
    taskName: params.title,
    userInstruction,
    body: params.compiledTaskPrompt,
    mergedText: params.compiledTaskPrompt,
    kinTaskText: params.compiledTaskPrompt,
    status: "formatted",
    updatedAt: new Date().toISOString(),
  };
}
