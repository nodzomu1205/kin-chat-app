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
  const syncMessage = args.prepareTaskSyncMessage(args.note);
  if (!syncMessage) return;

  args.setKinInput(syncMessage);
  args.appendGptMessage({
    id: generateId(),
    role: "gpt",
    text: "Prepared a task sync message for Kin.",
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

  args.setApprovedIntentPhrases((prev) => {
    const exists = prev.some(
      (item) =>
        item.kind === candidate.kind &&
        item.phrase === candidate.phrase &&
        item.count === candidate.count &&
        item.rule === candidate.rule &&
        item.charLimit === candidate.charLimit
    );
    if (exists) return prev;
    return [
      {
        id: `approved-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        phrase: candidate.phrase,
        kind: candidate.kind,
        count: candidate.count,
        rule: candidate.rule,
        charLimit: candidate.charLimit,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ].slice(0, 100);
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
