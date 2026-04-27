import { generateId } from "@/lib/shared/uuid";
import { applyCompiledTaskPromptToKinInput } from "@/lib/app/task-support/kinTaskInjection";
import { compileKinTaskPrompt } from "@/lib/task/taskCompiler";
import type { ApprovedIntentPhrase, PendingIntentCandidate } from "@/lib/task/taskIntent";
import { normalizeUsage } from "@/lib/shared/tokenStats";
import type { BucketUsageOptions } from "@/lib/shared/tokenStats";
import type { Message } from "@/types/chat";
import type { ReasoningMode } from "@/lib/app/task-runtime/reasoningMode";
import type { PendingKinInjectionPurpose } from "@/lib/app/kin-protocol/kinMultipart";
import type { TaskIntent } from "@/types/taskProtocol";

type StartedTask = {
  taskId: string;
  title: string;
  compiledTaskPrompt: string;
};

type IntentResolution = {
  intent: TaskIntent;
  usage?: Parameters<typeof normalizeUsage>[0];
  pendingCandidates: PendingIntentCandidate[];
};

type StartKinTaskArgs = {
  rawInput: string;
  approvedIntentPhrases: ApprovedIntentPhrase[];
  reasoningMode: ReasoningMode;
  resolveIntent: (args: {
    input: string;
    approvedPhrases: ApprovedIntentPhrase[];
    reasoningMode: ReasoningMode;
  }) => Promise<IntentResolution>;
  applyTaskUsage: (
    usage: Parameters<typeof normalizeUsage>[0],
    options?: BucketUsageOptions
  ) => void;
  mergePendingIntentCandidates: (candidates: PendingIntentCandidate[]) => void;
  startTask: (params: {
    originalInstruction: string;
    intent: TaskIntent;
    title?: string;
  }) => StartedTask;
  syncTaskDraftFromProtocol: (params: {
    taskId: string;
    title: string;
    goal: string;
    compiledTaskPrompt: string;
    originalInstruction?: string;
    intent?: TaskIntent;
  }) => void;
  setPendingKinInjectionBlocks: (value: string[]) => void;
  setPendingKinInjectionIndex: (value: number) => void;
  setPendingKinInjectionPurpose?: (value: PendingKinInjectionPurpose) => void;
  setKinInput: (value: string) => void;
  setGptInput: (value: string) => void;
  setGptLoading: (value: boolean) => void;
  appendGptMessage: (message: Message) => void;
  setActiveTabToKin?: () => void;
  extractTaskGoalFromSysTaskBlock: (text: string) => string;
};

type RegisterTaskDraftArgs = {
  rawInput: string;
  approvedIntentPhrases: ApprovedIntentPhrase[];
  reasoningMode: ReasoningMode;
  resolveIntent: (args: {
    input: string;
    approvedPhrases: ApprovedIntentPhrase[];
    reasoningMode: ReasoningMode;
  }) => Promise<IntentResolution>;
  applyTaskUsage: (
    usage: Parameters<typeof normalizeUsage>[0],
    options?: BucketUsageOptions
  ) => void;
  mergePendingIntentCandidates: (candidates: PendingIntentCandidate[]) => void;
  syncTaskDraftFromProtocol: (params: {
    taskId: string;
    title: string;
    goal: string;
    compiledTaskPrompt: string;
    originalInstruction?: string;
    intent?: TaskIntent;
  }) => void;
  setGptInput: (value: string) => void;
  setGptLoading: (value: boolean) => void;
  appendGptMessage: (message: Message) => void;
  extractTaskGoalFromSysTaskBlock: (text: string) => string;
};

function createRegistrationTaskId() {
  return `R${String(Date.now()).slice(-6)}`;
}

export async function runRegisterTaskDraftFlow({
  rawInput,
  approvedIntentPhrases,
  reasoningMode,
  resolveIntent,
  applyTaskUsage,
  mergePendingIntentCandidates,
  syncTaskDraftFromProtocol,
  setGptInput,
  setGptLoading,
  appendGptMessage,
  extractTaskGoalFromSysTaskBlock,
}: RegisterTaskDraftArgs) {
  const raw = rawInput.trim();
  if (!raw) return;

  const normalizedInput = raw.includes("<<SYS_TASK>>")
    ? extractTaskGoalFromSysTaskBlock(raw) ||
      raw.replace(/<<SYS_TASK>>[\s\S]*?(?:<<END_SYS_TASK>>|<<SYS_TASK_END>>)/g, "").trim()
    : raw;
  const effectiveInput = normalizedInput.trim() || raw;

  setGptLoading(true);
  try {
    const resolved = await resolveIntent({
      input: effectiveInput,
      approvedPhrases: approvedIntentPhrases,
      reasoningMode,
    });
    applyTaskUsage(resolved.usage);

    if (resolved.pendingCandidates.length > 0) {
      mergePendingIntentCandidates(resolved.pendingCandidates);
    }

    const taskId = createRegistrationTaskId();
    const title = resolved.intent.goal;
    const compiledTaskPrompt = compileKinTaskPrompt({
      taskId,
      title,
      originalInstruction: effectiveInput,
      intent: resolved.intent,
    });

    syncTaskDraftFromProtocol({
      taskId,
      title,
      goal: resolved.intent.goal,
      compiledTaskPrompt,
      originalInstruction: effectiveInput,
      intent: resolved.intent,
    });

    setGptInput("");
    appendGptMessage({
      id: generateId(),
      role: "gpt",
      text: `Task registration draft generated. TASK_ID: #${taskId}`,
      meta: {
        kind: "task_info",
        sourceType: "manual",
      },
    });
  } finally {
    setGptLoading(false);
  }
}

export async function runStartKinTaskFlow({
  rawInput,
  approvedIntentPhrases,
  reasoningMode,
  resolveIntent,
  applyTaskUsage,
  mergePendingIntentCandidates,
  startTask,
  syncTaskDraftFromProtocol,
  setPendingKinInjectionBlocks,
  setPendingKinInjectionIndex,
  setPendingKinInjectionPurpose,
  setKinInput,
  setGptInput,
  setGptLoading,
  appendGptMessage,
  setActiveTabToKin,
  extractTaskGoalFromSysTaskBlock,
}: StartKinTaskArgs) {
  const raw = rawInput.trim();
  if (!raw) return;

  const normalizedInput = raw.includes("<<SYS_TASK>>")
    ? extractTaskGoalFromSysTaskBlock(raw) ||
      raw.replace(/<<SYS_TASK>>[\s\S]*?(?:<<END_SYS_TASK>>|<<SYS_TASK_END>>)/g, "").trim()
    : raw;
  const effectiveInput = normalizedInput.trim() || raw;

  setGptLoading(true);

  try {
    const resolved = await resolveIntent({
      input: effectiveInput,
      approvedPhrases: approvedIntentPhrases,
      reasoningMode,
    });
    applyTaskUsage(resolved.usage);

    if (resolved.pendingCandidates.length > 0) {
      mergePendingIntentCandidates(resolved.pendingCandidates);
    }

    const started = startTask({
      originalInstruction: effectiveInput,
      intent: resolved.intent,
    });

    syncTaskDraftFromProtocol({
      taskId: started.taskId,
      title: started.title,
      goal: resolved.intent.goal,
      compiledTaskPrompt: started.compiledTaskPrompt,
      originalInstruction: effectiveInput,
    });

    const injection = applyCompiledTaskPromptToKinInput({
      compiledTaskPrompt: started.compiledTaskPrompt,
      setPendingKinInjectionBlocks,
      setPendingKinInjectionIndex,
      setPendingKinInjectionPurpose,
      setKinInput,
    });
    setGptInput("");
    appendGptMessage({
      id: generateId(),
      role: "gpt",
      text:
        injection.partCount > 1
          ? `New Kin task generated and split into ${injection.partCount} Kin parts. TASK_ID: #${started.taskId}`
          : `New Kin task generated and set to Kin input. TASK_ID: #${started.taskId}`,
      meta: {
        kind: "task_info",
        sourceType: "manual",
      },
    });

    setActiveTabToKin?.();
  } finally {
    setGptLoading(false);
  }
}
