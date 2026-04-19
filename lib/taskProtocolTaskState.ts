import { compileKinTaskPrompt } from "@/lib/taskCompiler";
import { mergeRequirementProgressForIntent } from "@/lib/taskProtocolState";
import type {
  TaskIntent,
  TaskRequirementProgress,
  TaskRuntimeState,
} from "@/types/taskProtocol";

type StartTaskStateParams = {
  prev: TaskRuntimeState;
  taskId: string;
  originalInstruction: string;
  intent: TaskIntent;
  title?: string;
  now: number;
};

type ReplaceCurrentTaskIntentParams = {
  prev: TaskRuntimeState;
  taskId: string;
  intent: TaskIntent;
  title?: string;
  originalInstruction?: string;
};

export function resolveTaskRecompileSourceInstruction(params: {
  originalInstruction?: string | null;
  draftUserInstruction?: string | null;
  intentGoal?: string | null;
}) {
  return (
    params.originalInstruction?.trim() ||
    params.draftUserInstruction?.trim() ||
    params.intentGoal?.trim() ||
    ""
  );
}

export type TaskRuntimePromptArtifacts = {
  title: string;
  compiledTaskPrompt: string;
  requirementProgress: TaskRequirementProgress[];
};

function resolveTaskTitle(params: {
  intent: TaskIntent;
  title?: string;
  fallbackTitle?: string;
  originalInstruction?: string;
}) {
  return params.title?.trim() || params.fallbackTitle || "";
}

function buildTaskRuntimePromptArtifacts(params: {
  taskId: string;
  intent: TaskIntent;
  originalInstruction?: string;
  title?: string;
  fallbackTitle?: string;
  previousRequirementProgress?: TaskRequirementProgress[];
}) : TaskRuntimePromptArtifacts {
  const title = resolveTaskTitle({
    intent: params.intent,
    title: params.title,
    fallbackTitle: params.fallbackTitle,
    originalInstruction: params.originalInstruction,
  });
  const compiledTaskPrompt = compileKinTaskPrompt({
    taskId: params.taskId,
    title,
    originalInstruction: params.originalInstruction,
    intent: params.intent,
  });
  const requirementProgress = mergeRequirementProgressForIntent(
    params.previousRequirementProgress || [],
    params.intent
  );

  return {
    title,
    compiledTaskPrompt,
    requirementProgress,
  };
}

export function buildStartedTaskState(params: StartTaskStateParams) {
  const artifacts = buildTaskRuntimePromptArtifacts({
    taskId: params.taskId,
    intent: params.intent,
    originalInstruction: params.originalInstruction,
    title: params.title,
  });

  return {
    title: artifacts.title,
    compiledTaskPrompt: artifacts.compiledTaskPrompt,
    nextState: {
      ...params.prev,
      currentTaskId: params.taskId,
      currentTaskTitle: artifacts.title,
      currentTaskIntent: params.intent,
      originalInstruction: params.originalInstruction,
      compiledTaskPrompt: artifacts.compiledTaskPrompt,
      taskStatus: "running" as const,
      latestSummary: params.intent.goal,
      requirementProgress: artifacts.requirementProgress,
      pendingRequests: [],
      userFacingRequests: [],
      protocolLog: [
        ...params.prev.protocolLog,
        {
          taskId: params.taskId,
          direction: "system" as const,
          type: "task_started",
          body: params.intent.goal,
          createdAt: params.now,
        },
      ],
    },
  };
}

export function buildReplacedTaskIntentState(params: ReplaceCurrentTaskIntentParams) {
  const artifacts = buildTaskRuntimePromptArtifacts({
    taskId: params.taskId,
    intent: params.intent,
    title: params.title,
    fallbackTitle: params.prev.currentTaskTitle,
    originalInstruction: params.originalInstruction,
    previousRequirementProgress: params.prev.requirementProgress,
  });

  return {
    title: artifacts.title,
    compiledTaskPrompt: artifacts.compiledTaskPrompt,
    nextState: {
      ...params.prev,
      currentTaskTitle: artifacts.title,
      currentTaskIntent: params.intent,
      originalInstruction:
        params.originalInstruction ?? params.prev.originalInstruction,
      compiledTaskPrompt: artifacts.compiledTaskPrompt,
      latestSummary: params.intent.goal,
      requirementProgress: artifacts.requirementProgress,
    },
  };
}
