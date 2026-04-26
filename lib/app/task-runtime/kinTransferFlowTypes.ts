import type { ReasoningMode } from "@/lib/app/task-runtime/reasoningMode";
import type { PendingKinInjectionPurpose } from "@/lib/app/kin-protocol/kinMultipart";
import type { TransformIntent } from "@/lib/app/task-runtime/transformIntent";
import type { BucketUsageOptions, normalizeUsage } from "@/lib/shared/tokenStats";
import type { ApprovedIntentPhrase, PendingIntentCandidate } from "@/lib/task/taskIntent";
import type { Message } from "@/types/chat";
import type { TaskIntent } from "@/types/taskProtocol";

export type ResolveTransformIntentResult = {
  intent: TransformIntent;
  usage?: Parameters<typeof normalizeUsage>[0];
};

export type ResolveTaskIntentResult = {
  intent: TaskIntent;
  usage?: Parameters<typeof normalizeUsage>[0];
  pendingCandidates: PendingIntentCandidate[];
};

export type SendLatestGptContentToKinArgs = {
  gptMessages: Message[];
  gptInput: string;
  currentTaskSlot: number;
  currentTaskTitle: string;
  approvedIntentPhrases: ApprovedIntentPhrase[];
  resolveTransformIntent: (args: {
    input: string;
    defaultMode: "sys_info" | "sys_task";
    reasoningMode: ReasoningMode;
  }) => Promise<ResolveTransformIntentResult>;
  resolveTaskIntent: (args: {
    input: string;
    approvedPhrases: ApprovedIntentPhrase[];
    reasoningMode: ReasoningMode;
  }) => Promise<ResolveTaskIntentResult>;
  mergePendingIntentCandidates: (candidates: PendingIntentCandidate[]) => void;
  startTask: (params: {
    originalInstruction: string;
    intent: TaskIntent;
    title?: string;
  }) => { taskId: string; title: string; compiledTaskPrompt: string };
  syncTaskDraftFromProtocol: (params: {
    taskId: string;
    title: string;
    goal: string;
    compiledTaskPrompt: string;
    originalInstruction?: string;
  }) => void;
  reasoningMode: ReasoningMode;
  applyTaskUsage: (
    usage: Parameters<typeof normalizeUsage>[0],
    options?: BucketUsageOptions
  ) => void;
  shouldTransformContent: (intent: TransformIntent) => boolean;
  transformTextWithIntent: (args: {
    text: string;
    intent: TransformIntent;
    reasoningMode: ReasoningMode;
  }) => Promise<{ text: string; usage?: Parameters<typeof normalizeUsage>[0] }>;
  setGptLoading: (value: boolean) => void;
  setGptMessages: (updater: (prev: Message[]) => Message[]) => void;
  setPendingKinInjectionBlocks: (value: string[]) => void;
  setPendingKinInjectionIndex: (value: number) => void;
  setPendingKinInjectionPurpose?: (value: PendingKinInjectionPurpose) => void;
  setKinInput: (value: string) => void;
  setGptInput: (value: string) => void;
  getTaskSlotLabel: () => string;
  setActiveTabToKin?: () => void;
};

export type SendCurrentTaskContentToKinArgs = {
  gptInput: string;
  getTaskBaseText: () => string;
  currentTaskSlot: number;
  currentTaskTitle: string;
  currentTaskInstruction?: string;
  approvedIntentPhrases: ApprovedIntentPhrase[];
  looksLikeTaskInstruction: (text: string) => boolean;
  runStartKinTaskFromInput: () => void | Promise<void>;
  resolveTransformIntent: (args: {
    input: string;
    defaultMode: "sys_info" | "sys_task";
    reasoningMode: ReasoningMode;
  }) => Promise<ResolveTransformIntentResult>;
  resolveTaskIntent: (args: {
    input: string;
    approvedPhrases: ApprovedIntentPhrase[];
    reasoningMode: ReasoningMode;
  }) => Promise<ResolveTaskIntentResult>;
  mergePendingIntentCandidates: (candidates: PendingIntentCandidate[]) => void;
  startTask: (params: {
    originalInstruction: string;
    intent: TaskIntent;
    title?: string;
  }) => { taskId: string; title: string; compiledTaskPrompt: string };
  syncTaskDraftFromProtocol: (params: {
    taskId: string;
    title: string;
    goal: string;
    compiledTaskPrompt: string;
    originalInstruction?: string;
  }) => void;
  reasoningMode: ReasoningMode;
  applyTaskUsage: (
    usage: Parameters<typeof normalizeUsage>[0],
    options?: BucketUsageOptions
  ) => void;
  shouldTransformContent: (intent: TransformIntent) => boolean;
  transformTextWithIntent: (args: {
    text: string;
    intent: TransformIntent;
    reasoningMode: ReasoningMode;
  }) => Promise<{ text: string; usage?: Parameters<typeof normalizeUsage>[0] }>;
  setGptLoading: (value: boolean) => void;
  setGptMessages: (updater: (prev: Message[]) => Message[]) => void;
  setPendingKinInjectionBlocks: (value: string[]) => void;
  setPendingKinInjectionIndex: (value: number) => void;
  setPendingKinInjectionPurpose?: (value: PendingKinInjectionPurpose) => void;
  setKinInput: (value: string) => void;
  setGptInput: (value: string) => void;
  getTaskSlotLabel: () => string;
  setActiveTabToKin?: () => void;
};
