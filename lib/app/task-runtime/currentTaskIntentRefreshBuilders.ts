import type { TaskIntent } from "@/types/taskProtocol";
import type { SyncApprovedIntentPhrasesToCurrentTaskFlowArgs } from "@/lib/app/task-runtime/currentTaskIntentRefresh";

export function buildCurrentTaskIntentRefreshResolverArgs(
  args: SyncApprovedIntentPhrasesToCurrentTaskFlowArgs
) {
  const sourceInstruction = args.sourceInstruction.trim();
  const hasActiveTask = Boolean(args.currentTaskId && args.replaceCurrentTaskIntent);
  const hasDraftTask = Boolean(args.currentTaskDraftTaskId?.trim());
  if (!sourceInstruction || (!hasActiveTask && !hasDraftTask)) {
    return null;
  }

  return {
    sourceInstruction,
    approvedPhrases: args.approvedIntentPhrases,
    reasoningMode: args.reasoningMode,
    currentTaskTitle: args.currentTaskTitle,
    currentTaskDraftTitle: args.currentTaskDraftTitle,
    replaceCurrentTaskIntent: hasActiveTask
      ? args.replaceCurrentTaskIntent
      : undefined,
  };
}

export function buildCurrentTaskIntentRefreshApplyArgs(args: {
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
  setPendingKinInjectionPurpose?: SyncApprovedIntentPhrasesToCurrentTaskFlowArgs["setPendingKinInjectionPurpose"];
  setKinInput: SyncApprovedIntentPhrasesToCurrentTaskFlowArgs["setKinInput"];
}) {
  return {
    syncTaskDraftArgs: {
      taskId: args.replacedTask.taskId,
      title: args.replacedTask.title,
      goal: args.resolvedIntent.goal,
      compiledTaskPrompt: args.replacedTask.compiledTaskPrompt,
      originalInstruction: args.sourceInstruction,
      intent: args.resolvedIntent,
    },
    kinInjectionArgs: {
      compiledTaskPrompt: args.replacedTask.compiledTaskPrompt,
      setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
      setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
      setPendingKinInjectionPurpose: args.setPendingKinInjectionPurpose,
      setKinInput: args.setKinInput,
    },
  };
}
