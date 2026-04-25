import type { TaskIntent } from "@/types/taskProtocol";
import type { SyncApprovedIntentPhrasesToCurrentTaskFlowArgs } from "@/lib/app/currentTaskIntentRefresh";

export function buildCurrentTaskIntentRefreshResolverArgs(
  args: SyncApprovedIntentPhrasesToCurrentTaskFlowArgs
) {
  const sourceInstruction = args.sourceInstruction.trim();
  if (!sourceInstruction || !args.currentTaskId || !args.replaceCurrentTaskIntent) {
    return null;
  }

  return {
    sourceInstruction,
    approvedPhrases: args.approvedIntentPhrases,
    reasoningMode: args.reasoningMode,
    currentTaskTitle: args.currentTaskTitle,
    currentTaskDraftTitle: args.currentTaskDraftTitle,
    replaceCurrentTaskIntent: args.replaceCurrentTaskIntent,
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
  setKinInput: SyncApprovedIntentPhrasesToCurrentTaskFlowArgs["setKinInput"];
}) {
  return {
    syncTaskDraftArgs: {
      taskId: args.replacedTask.taskId,
      title: args.replacedTask.title,
      goal: args.resolvedIntent.goal,
      compiledTaskPrompt: args.replacedTask.compiledTaskPrompt,
      originalInstruction: args.sourceInstruction,
    },
    kinInjectionArgs: {
      compiledTaskPrompt: args.replacedTask.compiledTaskPrompt,
      setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
      setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
      setKinInput: args.setKinInput,
    },
  };
}
