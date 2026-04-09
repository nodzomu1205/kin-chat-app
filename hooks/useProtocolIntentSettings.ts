"use client";

import { useEffect, useState } from "react";
import type {
  ApprovedIntentPhrase,
  PendingIntentCandidate,
} from "@/lib/taskIntent";
import {
  DEFAULT_PROTOCOL_PROMPT,
  DEFAULT_PROTOCOL_RULEBOOK,
} from "@/lib/app/kinProtocolDefaults";
import { migrateLegacyProtocolLimits } from "@/lib/app/kinProtocolMigration";
import {
  APPROVED_INTENT_PHRASES_KEY,
  PENDING_INTENT_CANDIDATES_KEY,
  PROTOCOL_PROMPT_DEFAULT_KEY,
  PROTOCOL_PROMPT_KEY,
  PROTOCOL_RULEBOOK_DEFAULT_KEY,
  PROTOCOL_RULEBOOK_KEY,
  REJECTED_INTENT_CANDIDATES_KEY,
} from "@/lib/app/chatPageStorageKeys";

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
  const [protocolRulebook, setProtocolRulebook] = useState(
    DEFAULT_PROTOCOL_RULEBOOK
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedPrompt = window.localStorage.getItem(PROTOCOL_PROMPT_KEY);
    const savedRulebook = window.localStorage.getItem(PROTOCOL_RULEBOOK_KEY);
    const savedPromptDefault = window.localStorage.getItem(
      PROTOCOL_PROMPT_DEFAULT_KEY
    );
    const savedRulebookDefault = window.localStorage.getItem(
      PROTOCOL_RULEBOOK_DEFAULT_KEY
    );
    const savedPendingIntentCandidates = window.localStorage.getItem(
      PENDING_INTENT_CANDIDATES_KEY
    );
    const savedApprovedIntentPhrases = window.localStorage.getItem(
      APPROVED_INTENT_PHRASES_KEY
    );
    const savedRejectedIntentCandidates = window.localStorage.getItem(
      REJECTED_INTENT_CANDIDATES_KEY
    );

    if (savedPrompt) {
      setProtocolPrompt(migrateLegacyProtocolLimits(savedPrompt));
    } else if (savedPromptDefault) {
      setProtocolPrompt(migrateLegacyProtocolLimits(savedPromptDefault));
    }

    if (savedRulebook) {
      setProtocolRulebook(migrateLegacyProtocolLimits(savedRulebook));
    } else if (savedRulebookDefault) {
      setProtocolRulebook(migrateLegacyProtocolLimits(savedRulebookDefault));
    }

    if (savedPendingIntentCandidates) {
      try {
        const parsed = JSON.parse(savedPendingIntentCandidates) as PendingIntentCandidate[];
        if (Array.isArray(parsed)) setPendingIntentCandidates(parsed);
      } catch {}
    }

    if (savedApprovedIntentPhrases) {
      try {
        const parsed = JSON.parse(savedApprovedIntentPhrases) as ApprovedIntentPhrase[];
        if (Array.isArray(parsed)) setApprovedIntentPhrases(parsed);
      } catch {}
    }

    if (savedRejectedIntentCandidates) {
      try {
        const parsed = JSON.parse(savedRejectedIntentCandidates) as string[];
        if (Array.isArray(parsed)) setRejectedIntentCandidateSignatures(parsed);
      } catch {}
    }
  }, []);

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
      JSON.stringify(pendingIntentCandidates)
    );
  }, [pendingIntentCandidates]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      APPROVED_INTENT_PHRASES_KEY,
      JSON.stringify(approvedIntentPhrases)
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
