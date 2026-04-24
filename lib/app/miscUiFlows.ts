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
} from "@/lib/taskIntentPhraseState";
import {
  buildNextApprovedIntentPhrasesOnApprove,
} from "@/lib/taskIntentPhraseState";

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
      text: "現在のタスクが見つからないため、同期メッセージは準備できませんでした。",
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
      text: "現在のタスクが見つからないため、中断メッセージは準備できませんでした。",
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
  args.setApprovedIntentPhrases((prev) => {
    return buildNextApprovedIntentPhrasesOnApprove({
      pendingIntentCandidates: args.pendingIntentCandidates,
      approvedIntentPhrases: prev,
      candidateId: args.candidateId,
    });
  });

  args.setPendingIntentCandidates((prev) =>
    prev.filter((item) => item.id !== args.candidateId)
  );
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
