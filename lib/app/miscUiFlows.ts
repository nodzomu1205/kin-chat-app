import type { Dispatch, SetStateAction } from "react";
import { generateId } from "@/lib/uuid";
import {
  getSavedProtocolDefaults,
  normalizeProtocolRulebook,
} from "@/lib/app/kinProtocolDefaults";
import type { Message } from "@/types/chat";
import type {
  ApprovedIntentPhrase,
  PendingIntentCandidate,
} from "@/lib/taskIntent";
import {
  parseIntentCandidateDraftText,
  resolveTaskIntentWithFallback,
} from "@/lib/taskIntent";
import {
  buildPendingKinInjectionBlocks,
  DEFAULT_KIN_TASK_MULTIPART_NOTICE_LINES,
} from "@/lib/app/kinMultipart";
import type { TaskIntent } from "@/types/taskProtocol";

export function prepareTaskRequestAckFlow(args: {
  requestId: string;
  prepareWaitingAckMessage: (requestId: string) => string | null;
  setKinInput: (value: string) => void;
  appendGptMessage: (message: Message) => void;
  setActiveTabToKin?: () => void;
}) {
  const ackMessage = args.prepareWaitingAckMessage(args.requestId);
  if (!ackMessage) return;

  args.setKinInput(ackMessage);
  args.appendGptMessage({
    id: generateId(),
    role: "gpt",
    text: `Prepared Kin acknowledgment for request ${args.requestId}.`,
    meta: {
      kind: "task_info",
      sourceType: "manual",
    },
  });
  args.setActiveTabToKin?.();
}

export function prepareTaskSyncFlow(args: {
  note: string;
  prepareTaskSyncMessage: (note: string) => string | null;
  setKinInput: (value: string) => void;
  appendGptMessage: (message: Message) => void;
  setActiveTabToKin?: () => void;
}) {
  const note = args.note.trim();
  const syncMessage = note.startsWith("<<SYS_")
    ? note
    : args.prepareTaskSyncMessage(args.note);
  if (!syncMessage) {
    args.appendGptMessage({
      id: generateId(),
      role: "gpt",
      text: "進行中のタスクが無いため、再同期メッセージは作成できません。",
      meta: {
        kind: "task_info",
        sourceType: "manual",
      },
    });
    return;
  }

  args.setKinInput(syncMessage);
  args.appendGptMessage({
    id: generateId(),
    role: "gpt",
    text: note.startsWith("<<SYS_")
      ? "Set the prepared task progress message to the Kin input box."
      : "Prepared a task sync message for Kin.",
    meta: {
      kind: "task_info",
      sourceType: "manual",
    },
  });
  args.setActiveTabToKin?.();
}

export function prepareTaskSuspendFlow(args: {
  note: string;
  prepareTaskSuspendMessage: (note: string) => string | null;
  setKinInput: (value: string) => void;
  appendGptMessage: (message: Message) => void;
  setActiveTabToKin?: () => void;
}) {
  const suspendMessage = args.prepareTaskSuspendMessage(args.note);
  if (!suspendMessage) {
    args.appendGptMessage({
      id: generateId(),
      role: "gpt",
      text: "進行中のタスクが無いため、中断メッセージは作成できません。",
      meta: {
        kind: "task_info",
        sourceType: "manual",
      },
    });
    return;
  }

  args.setKinInput(suspendMessage);
  args.appendGptMessage({
    id: generateId(),
    role: "gpt",
    text: "Prepared a task suspend message for Kin.",
    meta: {
      kind: "task_info",
      sourceType: "manual",
    },
  });
  args.setActiveTabToKin?.();
}

export function resetProtocolDefaultsFlow(args: {
  promptDefaultKey: string;
  rulebookDefaultKey: string;
  setProtocolPrompt: (value: string) => void;
  setProtocolRulebook: (value: string) => void;
}) {
  const savedDefaults = getSavedProtocolDefaults({
    promptDefaultKey: args.promptDefaultKey,
    rulebookDefaultKey: args.rulebookDefaultKey,
  });
  args.setProtocolPrompt(savedDefaults.prompt);
  args.setProtocolRulebook(savedDefaults.rulebook);
}

export function saveProtocolDefaultsFlow(args: {
  protocolPrompt: string;
  protocolRulebook: string;
  promptDefaultKey: string;
  rulebookDefaultKey: string;
  appendGptMessage: (message: Message) => void;
}) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(args.promptDefaultKey, args.protocolPrompt);
  window.localStorage.setItem(args.rulebookDefaultKey, args.protocolRulebook);
  args.appendGptMessage({
    id: generateId(),
    role: "gpt",
    text: "Protocol settings were saved as the new default.",
    meta: {
      kind: "task_info",
      sourceType: "manual",
    },
  });
}

export function approveIntentCandidateFlow(args: {
  candidateId: string;
  pendingIntentCandidates: PendingIntentCandidate[];
  setApprovedIntentPhrases: Dispatch<SetStateAction<ApprovedIntentPhrase[]>>;
  setPendingIntentCandidates: Dispatch<SetStateAction<PendingIntentCandidate[]>>;
}) {
  const candidate = args.pendingIntentCandidates.find((item) => item.id === args.candidateId);
  if (!candidate) return;
  const normalizedCandidate = {
    ...candidate,
    ...parseIntentCandidateDraftText(candidate.draftText || candidate.phrase, candidate),
  };

  args.setApprovedIntentPhrases((prev) => {
    const existing = prev.find(
      (item) =>
        item.kind === normalizedCandidate.kind &&
        item.phrase === normalizedCandidate.phrase &&
        item.count === normalizedCandidate.count &&
        item.rule === normalizedCandidate.rule &&
        item.charLimit === normalizedCandidate.charLimit
    );
    if (existing) {
      return prev.map((item) =>
        item.id === existing.id
          ? {
              ...item,
              approvedCount: (item.approvedCount ?? 0) + 1,
              draftText: normalizedCandidate.draftText,
            }
          : item
      );
    }
    return [
      {
        id: `approved-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        phrase: normalizedCandidate.phrase,
        kind: normalizedCandidate.kind,
        count: normalizedCandidate.count,
        rule: normalizedCandidate.rule,
        charLimit: normalizedCandidate.charLimit,
        draftText: normalizedCandidate.draftText,
        approvedCount: 1,
        rejectedCount: 0,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ].slice(0, 100);
  });

  args.setPendingIntentCandidates((prev) =>
    prev.filter((item) => item.id !== args.candidateId)
  );
}

export function buildNextApprovedIntentPhrasesOnApprove(args: {
  pendingIntentCandidates: PendingIntentCandidate[];
  approvedIntentPhrases: ApprovedIntentPhrase[];
  candidateId: string;
}) {
  const candidate = args.pendingIntentCandidates.find((item) => item.id === args.candidateId);
  if (!candidate) return args.approvedIntentPhrases;
  const normalizedCandidate = {
    ...candidate,
    ...parseIntentCandidateDraftText(candidate.draftText || candidate.phrase, candidate),
  };

  const existing = args.approvedIntentPhrases.find(
    (item) =>
      item.kind === normalizedCandidate.kind &&
      item.phrase === normalizedCandidate.phrase &&
      item.count === normalizedCandidate.count &&
      item.rule === normalizedCandidate.rule &&
      item.charLimit === normalizedCandidate.charLimit
  );

  if (existing) {
    return args.approvedIntentPhrases.map((item) =>
        item.id === existing.id
          ? {
            ...item,
            approvedCount: (item.approvedCount ?? 0) + 1,
            draftText: normalizedCandidate.draftText,
          }
        : item
    );
  }

  return [
    {
      id: `approved-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      phrase: normalizedCandidate.phrase,
      kind: normalizedCandidate.kind,
      count: normalizedCandidate.count,
      rule: normalizedCandidate.rule,
      charLimit: normalizedCandidate.charLimit,
      draftText: normalizedCandidate.draftText,
      approvedCount: 1,
      rejectedCount: 0,
      createdAt: new Date().toISOString(),
    },
    ...args.approvedIntentPhrases,
  ].slice(0, 100);
}

export function buildNextApprovedIntentPhrasesOnUpdate(args: {
  approvedIntentPhrases: ApprovedIntentPhrase[];
  phraseId: string;
  patch: Partial<ApprovedIntentPhrase>;
}) {
  return args.approvedIntentPhrases.map((item) =>
    item.id === args.phraseId
      ? {
          ...item,
          ...args.patch,
        }
      : item
  );
}

export function buildNextApprovedIntentPhrasesOnDelete(args: {
  approvedIntentPhrases: ApprovedIntentPhrase[];
  phraseId: string;
}) {
  return args.approvedIntentPhrases.filter((item) => item.id !== args.phraseId);
}

export async function syncApprovedIntentPhrasesToCurrentTaskFlow(args: {
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
  }) => void;
  setPendingKinInjectionBlocks: (blocks: string[]) => void;
  setPendingKinInjectionIndex: (index: number) => void;
  setKinInput: (value: string) => void;
}) {
  const sourceInstruction = args.sourceInstruction.trim();
  if (!sourceInstruction || !args.currentTaskId || !args.replaceCurrentTaskIntent) {
    return;
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

  if (!replaced) return;

  args.syncTaskDraftFromProtocol({
    taskId: replaced.taskId,
    title: replaced.title,
    goal: resolved.intent.goal,
    compiledTaskPrompt: replaced.compiledTaskPrompt,
  });
  const blocks = buildPendingKinInjectionBlocks(replaced.compiledTaskPrompt, {
    noticeLines: DEFAULT_KIN_TASK_MULTIPART_NOTICE_LINES,
  });
  args.setPendingKinInjectionBlocks(blocks.length > 1 ? blocks : []);
  args.setPendingKinInjectionIndex(0);
  args.setKinInput(blocks[0] ?? replaced.compiledTaskPrompt);
}

export function rejectIntentCandidateFlow(args: {
  candidateId: string;
  pendingIntentCandidates: PendingIntentCandidate[];
  getIntentCandidateSignature: (candidate: {
    kind: string;
    phrase: string;
    count?: number;
    rule?: string;
    charLimit?: number;
  }) => string;
  setRejectedIntentCandidateSignatures: Dispatch<SetStateAction<string[]>>;
  setPendingIntentCandidates: Dispatch<SetStateAction<PendingIntentCandidate[]>>;
}) {
  const candidate = args.pendingIntentCandidates.find((item) => item.id === args.candidateId);
  if (candidate) {
    const signature = args.getIntentCandidateSignature(candidate);
    args.setRejectedIntentCandidateSignatures((prev) =>
      prev.includes(signature) ? prev : [signature, ...prev].slice(0, 200)
    );
  }
  args.setPendingIntentCandidates((prev) =>
    prev.filter((item) => item.id !== args.candidateId)
  );
}

export function setProtocolRulebookToKinDraftFlow(args: {
  protocolRulebook: string;
  setKinInput: (value: string) => void;
  appendGptMessage: (message: Message) => void;
  setActiveTabToKin?: () => void;
}) {
  const normalized = normalizeProtocolRulebook(args.protocolRulebook);
  args.setKinInput(normalized);
  args.appendGptMessage({
    id: generateId(),
    role: "gpt",
    text: "Rulebook SYS_INFO was set to the Kin input box.",
    meta: {
      kind: "task_info",
      sourceType: "manual",
    },
  });
  args.setActiveTabToKin?.();
}

export async function sendProtocolRulebookToKinFlow(args: {
  protocolRulebook: string;
  sendKinMessage: (text: string) => Promise<void>;
  appendGptMessage: (message: Message) => void;
  setActiveTabToKin?: () => void;
}) {
  const normalized = normalizeProtocolRulebook(args.protocolRulebook);
  await args.sendKinMessage(normalized);
  args.appendGptMessage({
    id: generateId(),
    role: "gpt",
    text: "Rulebook SYS_INFO was sent to Kin.",
    meta: {
      kind: "task_info",
      sourceType: "manual",
    },
  });
  args.setActiveTabToKin?.();
}
