import { generateId } from "@/lib/uuid";
import { extractPreferredKinTransferText } from "@/lib/app/kinStructuredProtocol";
import { resolveTaskIntentWithFallback, type ApprovedIntentPhrase, type PendingIntentCandidate } from "@/lib/taskIntent";
import { normalizeUsage } from "@/lib/tokenStats";
import type { Message } from "@/types/chat";
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
  responseMode: "strict" | "creative";
  resolveIntent: (args: {
    input: string;
    approvedPhrases: ApprovedIntentPhrase[];
    responseMode: "strict" | "creative";
  }) => Promise<IntentResolution>;
  applyTaskUsage: (usage: Parameters<typeof normalizeUsage>[0]) => void;
  mergePendingIntentCandidates: (candidates: PendingIntentCandidate[]) => void;
  startTask: (params: {
    originalInstruction: string;
    intent: TaskIntent;
  }) => StartedTask;
  syncTaskDraftFromProtocol: (params: {
    taskId: string;
    title: string;
    goal: string;
    compiledTaskPrompt: string;
  }) => void;
  setKinInput: (value: string) => void;
  setGptInput: (value: string) => void;
  appendGptMessage: (message: Message) => void;
  setActiveTabToKin?: () => void;
  extractTaskGoalFromSysTaskBlock: (text: string) => string;
};

export async function runStartKinTaskFlow({
  rawInput,
  approvedIntentPhrases,
  responseMode,
  resolveIntent,
  applyTaskUsage,
  mergePendingIntentCandidates,
  startTask,
  syncTaskDraftFromProtocol,
  setKinInput,
  setGptInput,
  appendGptMessage,
  setActiveTabToKin,
  extractTaskGoalFromSysTaskBlock,
}: StartKinTaskArgs) {
  const raw = rawInput.trim();
  if (!raw) return;

  const normalizedInput = raw.includes("<<SYS_TASK>>")
    ? extractTaskGoalFromSysTaskBlock(raw) ||
      raw.replace(/<<SYS_TASK>>[\s\S]*?<<SYS_TASK_END>>/g, "").trim()
    : raw;
  const effectiveInput = normalizedInput.trim() || raw;

  const resolved = await resolveIntent({
    input: effectiveInput,
    approvedPhrases: approvedIntentPhrases,
    responseMode,
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
  });

  setKinInput(started.compiledTaskPrompt);
  setGptInput("");
  appendGptMessage({
    id: generateId(),
    role: "gpt",
    text: `New Kin task generated and set to Kin input. TASK_ID: #${started.taskId}`,
    meta: {
      kind: "task_info",
      sourceType: "manual",
    },
  });

  setActiveTabToKin?.();
}

type ReceiveLastKinResponseArgs = {
  kinMessages: Message[];
  processMultipartTaskDoneText: (
    text: string,
    options?: { setGptTab?: boolean }
  ) => { handled: boolean; accepted: boolean } | null;
  setGptInput: (value: string) => void;
  appendGptMessage: (message: Message) => void;
  setActiveTabToKin?: () => void;
  setActiveTabToGpt?: () => void;
};

export function receiveLastKinResponseFlow({
  kinMessages,
  processMultipartTaskDoneText,
  setGptInput,
  appendGptMessage,
  setActiveTabToKin,
  setActiveTabToGpt,
}: ReceiveLastKinResponseArgs) {
  const last = [...kinMessages]
    .reverse()
    .find((m) => m.role === "kin" && typeof m.text === "string" && m.text.trim());

  if (!last) {
    appendGptMessage({
      id: generateId(),
      role: "gpt",
      text: "No recent Kin response was found.",
    });
    return;
  }

  const multipartHandled = processMultipartTaskDoneText(last.text, { setGptTab: true });
  if (multipartHandled) {
    setActiveTabToGpt?.();
    return;
  }

  setGptInput(extractPreferredKinTransferText(last.text));
  appendGptMessage({
    id: generateId(),
    role: "gpt",
    text: "The latest Kin response was copied into the GPT input box.",
    meta: {
      kind: "task_info",
      sourceType: "kin_message",
    },
  });
  setActiveTabToGpt?.();
}
