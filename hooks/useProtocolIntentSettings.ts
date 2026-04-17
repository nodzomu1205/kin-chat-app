"use client";

import { useEffect, useState } from "react";
import type {
  ApprovedIntentPhrase,
  PendingIntentCandidate,
} from "@/lib/taskIntent";
import {
  normalizeApprovedIntentPhrase,
  normalizePendingIntentCandidate,
} from "@/lib/taskIntent";
import {
  APPROVED_INTENT_PHRASES_KEY,
  PENDING_INTENT_CANDIDATES_KEY,
  PROTOCOL_PROMPT_KEY,
  PROTOCOL_RULEBOOK_KEY,
  REJECTED_INTENT_CANDIDATES_KEY,
} from "@/lib/app/chatPageStorageKeys";
import { loadProtocolIntentSettingsState } from "@/lib/app/protocolIntentSettingsState";

export function useProtocolIntentSettings() {
  const [initialState] = useState(() =>
    loadProtocolIntentSettingsState(
      typeof window === "undefined" ? null : window.localStorage
    )
  );
  const [pendingIntentCandidates, setPendingIntentCandidates] = useState<
    PendingIntentCandidate[]
  >(initialState.pendingIntentCandidates);
  const [approvedIntentPhrases, setApprovedIntentPhrases] = useState<
    ApprovedIntentPhrase[]
  >(initialState.approvedIntentPhrases);
  const [rejectedIntentCandidateSignatures, setRejectedIntentCandidateSignatures] =
    useState<string[]>(initialState.rejectedIntentCandidateSignatures);
  const [protocolPrompt, setProtocolPrompt] = useState(initialState.protocolPrompt);
  const [protocolRulebook, setProtocolRulebook] = useState(
    initialState.protocolRulebook
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PROTOCOL_PROMPT_KEY, protocolPrompt);
  }, [protocolPrompt]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PROTOCOL_RULEBOOK_KEY, protocolRulebook);
  }, [protocolRulebook]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      PENDING_INTENT_CANDIDATES_KEY,
      JSON.stringify(pendingIntentCandidates.map(normalizePendingIntentCandidate))
    );
  }, [pendingIntentCandidates]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      APPROVED_INTENT_PHRASES_KEY,
      JSON.stringify(approvedIntentPhrases.map(normalizeApprovedIntentPhrase))
    );
  }, [approvedIntentPhrases]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      REJECTED_INTENT_CANDIDATES_KEY,
      JSON.stringify(rejectedIntentCandidateSignatures)
    );
  }, [rejectedIntentCandidateSignatures]);

  return {
    pendingIntentCandidates,
    setPendingIntentCandidates,
    approvedIntentPhrases,
    setApprovedIntentPhrases,
    rejectedIntentCandidateSignatures,
    setRejectedIntentCandidateSignatures,
    protocolPrompt,
    setProtocolPrompt,
    protocolRulebook,
    setProtocolRulebook,
  };
}
