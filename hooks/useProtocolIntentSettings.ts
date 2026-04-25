"use client";

import { useEffect, useState } from "react";
import type {
  ApprovedIntentPhrase,
  PendingIntentCandidate,
} from "@/lib/taskIntentPhraseState";
import {
  normalizeApprovedIntentPhrase,
  normalizePendingIntentCandidate,
} from "@/lib/taskIntentPhraseState";
import {
  APPROVED_INTENT_PHRASES_KEY,
  PENDING_INTENT_CANDIDATES_KEY,
  PROTOCOL_PROMPT_KEY,
  PROTOCOL_RULEBOOK_KEY,
  REJECTED_INTENT_CANDIDATES_KEY,
} from "@/lib/app/chatPageStorageKeys";
import { loadProtocolIntentSettingsState } from "@/lib/app/kin-protocol/protocolIntentSettingsState";
import {
  DEFAULT_PROTOCOL_PROMPT,
  DEFAULT_PROTOCOL_RULEBOOK,
} from "@/lib/app/kin-protocol/kinProtocolDefaults";

export function useProtocolIntentSettings() {
  const [pendingIntentCandidates, setPendingIntentCandidates] = useState<
    PendingIntentCandidate[]
  >([]);
  const [approvedIntentPhrases, setApprovedIntentPhrases] = useState<
    ApprovedIntentPhrase[]
  >([]);
  const [rejectedIntentCandidateSignatures, setRejectedIntentCandidateSignatures] =
    useState<string[]>([]);
  const [protocolPrompt, setProtocolPrompt] = useState(DEFAULT_PROTOCOL_PROMPT);
  const [protocolRulebook, setProtocolRulebook] = useState(DEFAULT_PROTOCOL_RULEBOOK);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const initialState = loadProtocolIntentSettingsState(
      typeof window === "undefined" ? null : window.localStorage
    );
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setPendingIntentCandidates(initialState.pendingIntentCandidates);
      setApprovedIntentPhrases(initialState.approvedIntentPhrases);
      setRejectedIntentCandidateSignatures(
        initialState.rejectedIntentCandidateSignatures
      );
      setProtocolPrompt(initialState.protocolPrompt);
      setProtocolRulebook(initialState.protocolRulebook);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PROTOCOL_PROMPT_KEY, protocolPrompt);
  }, [hydrated, protocolPrompt]);

  useEffect(() => {
    if (!hydrated) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PROTOCOL_RULEBOOK_KEY, protocolRulebook);
  }, [hydrated, protocolRulebook]);

  useEffect(() => {
    if (!hydrated) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      PENDING_INTENT_CANDIDATES_KEY,
      JSON.stringify(pendingIntentCandidates.map(normalizePendingIntentCandidate))
    );
  }, [hydrated, pendingIntentCandidates]);

  useEffect(() => {
    if (!hydrated) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      APPROVED_INTENT_PHRASES_KEY,
      JSON.stringify(approvedIntentPhrases.map(normalizeApprovedIntentPhrase))
    );
  }, [approvedIntentPhrases, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      REJECTED_INTENT_CANDIDATES_KEY,
      JSON.stringify(rejectedIntentCandidateSignatures)
    );
  }, [hydrated, rejectedIntentCandidateSignatures]);

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
