import { resolveTaskIntentWithFallback, type ApprovedIntentPhrase } from "@/lib/task/taskIntent";
import { applyCompiledTaskPromptToKinInput } from "@/lib/app/task-support/kinTaskInjection";
import type { BucketUsageOptions } from "@/lib/shared/tokenStats";
import {
  buildCurrentTaskIntentRefreshApplyArgs,
  buildCurrentTaskIntentRefreshResolverArgs,
} from "@/lib/app/task-runtime/currentTaskIntentRefreshBuilders";
import type { ReasoningMode } from "@/lib/app/task-runtime/reasoningMode";
import type { TaskIntent } from "@/types/taskProtocol";

export type SyncApprovedIntentPhrasesToCurrentTaskFlowArgs = {
  approvedIntentPhrases: ApprovedIntentPhrase[];
  sourceInstruction: string;
  currentTaskId: string | null;
  currentTaskTitle: string;
  currentTaskDraftTitle: string;
  reasoningMode: ReasoningMode;
  applyTaskUsage: (
    usage: { inputTokens: number; outputTokens: number; totalTokens: number } | null,
    options?: BucketUsageOptions
  ) => void;
  replaceCurrentTaskIntent?: (params: {
    intent: TaskIntent;
    title?: string;
    originalInstruction?: string;
  }) =>
    | {
        taskId: string;
        title: string;
        compiledTaskPrompt: string;
      }
    | null
    | undefined;
  syncTaskDraftFromProtocol: (args: {
    taskId: string;
    title: string;
    goal: string;
    compiledTaskPrompt: string;
    originalInstruction?: string;
  }) => void;
  setPendingKinInjectionBlocks: (blocks: string[]) => void;
  setPendingKinInjectionIndex: (index: number) => void;
  setKinInput: (value: string) => void;
};

async function resolveCurrentTaskIntentRefresh(
  args: SyncApprovedIntentPhrasesToCurrentTaskFlowArgs
) {
  const resolverArgs = buildCurrentTaskIntentRefreshResolverArgs(args);
  if (!resolverArgs) {
    return null;
  }

  const resolved = await resolveTaskIntentWithFallback({
    input: resolverArgs.sourceInstruction,
    approvedPhrases: resolverArgs.approvedPhrases,
    reasoningMode: resolverArgs.reasoningMode,
  });

  args.applyTaskUsage(resolved.usage);

  const replaced = resolverArgs.replaceCurrentTaskIntent({
    intent: resolved.intent,
    title: resolverArgs.currentTaskTitle || resolverArgs.currentTaskDraftTitle,
    originalInstruction: resolverArgs.sourceInstruction,
  });

  if (!replaced) return null;

  return {
    sourceInstruction: resolverArgs.sourceInstruction,
    resolvedIntent: resolved.intent,
    replacedTask: replaced,
  };
}

function applyCurrentTaskIntentRefresh(args: {
  sourceInstruction: string;
  resolvedIntent: TaskIntent;
  replacedTask: {
    taskId: string;
    title: string;
    compiledTaskPrompt: string;
  };
  syncTaskDraftFromProtocol: SyncApprovedIntentPhrasesToCurrentTaskFlowArgs["syncTaskDraftFromProtocol"];
  setPendingKinInjectionBlocks: SyncApprovedIntentPhrasesToCurrentTaskFlowArgs["setPendingKinInjectionBlocks"];
  setPendingKinInjectionIndex: SyncApprovedIntentPhrasesToCurrentTaskFlowArgs["setPendingKinInjectionIndex"];
  setKinInput: SyncApprovedIntentPhrasesToCurrentTaskFlowArgs["setKinInput"];
}) {
  const applyArgs = buildCurrentTaskIntentRefreshApplyArgs(args);
  args.syncTaskDraftFromProtocol(applyArgs.syncTaskDraftArgs);
  applyCompiledTaskPromptToKinInput(applyArgs.kinInjectionArgs);
}

export async function syncApprovedIntentPhrasesToCurrentTaskFlow(
  args: SyncApprovedIntentPhrasesToCurrentTaskFlowArgs
) {
  const refreshed = await resolveCurrentTaskIntentRefresh(args);
  if (!refreshed) return;

  applyCurrentTaskIntentRefresh({
    sourceInstruction: refreshed.sourceInstruction,
    resolvedIntent: refreshed.resolvedIntent,
    replacedTask: refreshed.replacedTask,
    syncTaskDraftFromProtocol: args.syncTaskDraftFromProtocol,
    setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
    setKinInput: args.setKinInput,
  });
}
