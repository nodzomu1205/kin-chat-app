import { compileKinTaskPrompt } from "@/lib/taskCompiler";
import { generateTaskTitle } from "@/lib/taskTitle";
import { mergeRequirementProgressForIntent } from "@/lib/taskProtocolState";
import { suggestTaskTitle } from "@/lib/app/contextNaming";
import type { TaskIntent, TaskRuntimeState } from "@/types/taskProtocol";

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

function resolveTaskTitle(params: {
  intent: TaskIntent;
  title?: string;
  fallbackTitle?: string;
  originalInstruction?: string;
}) {
  const titleSource = params.originalInstruction || params.intent.goal;
  const generated = generateTaskTitle({
    goal: titleSource,
    outputType: params.intent.output.type,
    entities: params.intent.entities,
  });
  const suggested = suggestTaskTitle({
    freeText: titleSource,
    fallback: params.fallbackTitle || params.intent.goal,
  });

  return (
    params.title?.trim() ||
    params.fallbackTitle ||
    generated ||
    suggested
  );
}

export function buildStartedTaskState(params: StartTaskStateParams) {
  const title = resolveTaskTitle({
    intent: params.intent,
    title: params.title,
    originalInstruction: params.originalInstruction,
  });
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
    originalInstruction: params.originalInstruction,
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
