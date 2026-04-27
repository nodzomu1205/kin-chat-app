import { resolveTaskIntentWithFallback, type ApprovedIntentPhrase } from "@/lib/task/taskIntent";
import { applyCompiledTaskPromptToKinInput } from "@/lib/app/task-support/kinTaskInjection";
import { compileKinTaskPrompt } from "@/lib/task/taskCompiler";
import type { BucketUsageOptions } from "@/lib/shared/tokenStats";
import {
  buildCurrentTaskIntentRefreshApplyArgs,
  buildCurrentTaskIntentRefreshResolverArgs,
} from "@/lib/app/task-runtime/currentTaskIntentRefreshBuilders";
import type { PendingKinInjectionPurpose } from "@/lib/app/kin-protocol/kinMultipart";
import type { ReasoningMode } from "@/lib/app/task-runtime/reasoningMode";
import type { TaskIntent } from "@/types/taskProtocol";

export type SyncApprovedIntentPhrasesToCurrentTaskFlowArgs = {
  approvedIntentPhrases: ApprovedIntentPhrase[];
  sourceInstruction: string;
  currentTaskId: string | null;
  currentTaskDraftTaskId?: string | null;
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
    intent?: import("@/types/taskProtocol").TaskIntent;
  }) => void;
  setPendingKinInjectionBlocks: (blocks: string[]) => void;
  setPendingKinInjectionIndex: (index: number) => void;
  setPendingKinInjectionPurpose?: (purpose: PendingKinInjectionPurpose) => void;
  setKinInput: (value: string) => void;
  updateKinInput?: boolean;
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

  const title = resolverArgs.currentTaskTitle || resolverArgs.currentTaskDraftTitle;
  const replaced = resolverArgs.replaceCurrentTaskIntent
    ? resolverArgs.replaceCurrentTaskIntent({
        intent: resolved.intent,
        title,
        originalInstruction: resolverArgs.sourceInstruction,
      })
    : null;
  const draftTaskId = args.currentTaskDraftTaskId?.trim() || "";
  const replacedTask =
    replaced ||
    (draftTaskId
      ? {
          taskId: draftTaskId,
          title: title || resolved.intent.goal,
          compiledTaskPrompt: compileKinTaskPrompt({
            taskId: draftTaskId,
            title: title || resolved.intent.goal,
            originalInstruction: resolverArgs.sourceInstruction,
            intent: resolved.intent,
          }),
        }
      : null);

  if (!replacedTask) return null;

  return {
    sourceInstruction: resolverArgs.sourceInstruction,
    resolvedIntent: resolved.intent,
    replacedTask,
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
  setPendingKinInjectionPurpose: SyncApprovedIntentPhrasesToCurrentTaskFlowArgs["setPendingKinInjectionPurpose"];
  setKinInput: SyncApprovedIntentPhrasesToCurrentTaskFlowArgs["setKinInput"];
  updateKinInput?: boolean;
}) {
  const applyArgs = buildCurrentTaskIntentRefreshApplyArgs(args);
  args.syncTaskDraftFromProtocol(applyArgs.syncTaskDraftArgs);
  if (args.updateKinInput !== false) {
    applyCompiledTaskPromptToKinInput(applyArgs.kinInjectionArgs);
  }
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
    setPendingKinInjectionPurpose: args.setPendingKinInjectionPurpose,
    setKinInput: args.setKinInput,
    updateKinInput: args.updateKinInput,
  });
}
