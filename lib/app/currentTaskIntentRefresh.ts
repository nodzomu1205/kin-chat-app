import { resolveTaskIntentWithFallback, type ApprovedIntentPhrase } from "@/lib/taskIntent";
import { applyCompiledTaskPromptToKinInput } from "@/lib/app/kinTaskInjection";
import type { TaskIntent } from "@/types/taskProtocol";

export type SyncApprovedIntentPhrasesToCurrentTaskFlowArgs = {
  approvedIntentPhrases: ApprovedIntentPhrase[];
  sourceInstruction: string;
  currentTaskId: string | null;
  currentTaskTitle: string;
  currentTaskDraftTitle: string;
  responseMode: "strict" | "creative";
  applyTaskUsage: (usage: { inputTokens: number; outputTokens: number; totalTokens: number } | null) => void;
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
  const sourceInstruction = args.sourceInstruction.trim();
  if (!sourceInstruction || !args.currentTaskId || !args.replaceCurrentTaskIntent) {
    return null;
  }

  const resolved = await resolveTaskIntentWithFallback({
    input: sourceInstruction,
    approvedPhrases: args.approvedIntentPhrases,
    responseMode: args.responseMode,
  });

  args.applyTaskUsage(resolved.usage);

  const replaced = args.replaceCurrentTaskIntent({
    intent: resolved.intent,
    title: resolved.suggestedTitle || args.currentTaskTitle || args.currentTaskDraftTitle,
    originalInstruction: sourceInstruction,
  });

  if (!replaced) return null;

  return {
    sourceInstruction,
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
  args.syncTaskDraftFromProtocol({
    taskId: args.replacedTask.taskId,
    title: args.replacedTask.title,
    goal: args.resolvedIntent.goal,
    compiledTaskPrompt: args.replacedTask.compiledTaskPrompt,
    originalInstruction: args.sourceInstruction,
  });
  applyCompiledTaskPromptToKinInput({
    compiledTaskPrompt: args.replacedTask.compiledTaskPrompt,
    setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
    setKinInput: args.setKinInput,
  });
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
