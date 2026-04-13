import { compileKinTaskPrompt } from "@/lib/taskCompiler";
import { generateTaskTitle } from "@/lib/taskTitle";
import { mergeRequirementProgressForIntent } from "@/lib/taskProtocolState";
import type { TaskIntent, TaskRuntimeState } from "@/types/taskProtocol";

type StartTaskStateParams = {
  prev: TaskRuntimeState;
  taskId: string;
  originalInstruction: string;
  intent: TaskIntent;
  now: number;
};

type ReplaceCurrentTaskIntentParams = {
  prev: TaskRuntimeState;
  taskId: string;
  intent: TaskIntent;
  title?: string;
  originalInstruction?: string;
};

function resolveTaskTitle(params: {
  intent: TaskIntent;
  title?: string;
  fallbackTitle?: string;
}) {
  return (
    params.title?.trim() ||
    params.fallbackTitle ||
    generateTaskTitle({
      goal: params.intent.goal,
      outputType: params.intent.output.type,
      entities: params.intent.entities,
    })
  );
}

export function buildStartedTaskState(params: StartTaskStateParams) {
  const title = resolveTaskTitle({ intent: params.intent });
  const compiledTaskPrompt = compileKinTaskPrompt({
    taskId: params.taskId,
    title,
    originalInstruction: params.originalInstruction,
    intent: params.intent,
  });
  const requirementProgress = mergeRequirementProgressForIntent([], params.intent);

  return {
    title,
    compiledTaskPrompt,
    nextState: {
      ...params.prev,
      currentTaskId: params.taskId,
      currentTaskTitle: title,
      currentTaskIntent: params.intent,
      compiledTaskPrompt,
      taskStatus: "running" as const,
      latestSummary: params.intent.goal,
      requirementProgress,
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
  const title = resolveTaskTitle({
    intent: params.intent,
    title: params.title,
    fallbackTitle: params.prev.currentTaskTitle,
  });
  const compiledTaskPrompt = compileKinTaskPrompt({
    taskId: params.taskId,
    title,
    originalInstruction: params.originalInstruction,
    intent: params.intent,
  });
  const requirementProgress = mergeRequirementProgressForIntent(
    params.prev.requirementProgress,
    params.intent
  );

  return {
    title,
    compiledTaskPrompt,
    nextState: {
      ...params.prev,
      currentTaskTitle: title,
      currentTaskIntent: params.intent,
      compiledTaskPrompt,
      latestSummary: params.intent.goal,
      requirementProgress,
    },
  };
}
