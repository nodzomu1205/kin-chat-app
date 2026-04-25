import type {
  ApprovedIntentPhrase,
  PendingIntentCandidate,
} from "@/lib/task/taskIntentPhraseState";
import {
  normalizeApprovedIntentPhrase,
  normalizePendingIntentCandidate,
} from "@/lib/task/taskIntentPhraseState";
import {
  DEFAULT_PROTOCOL_PROMPT,
  DEFAULT_PROTOCOL_RULEBOOK,
} from "@/lib/app/kin-protocol/kinProtocolDefaults";
import { migrateLegacyProtocolLimits } from "@/lib/app/kin-protocol/kinProtocolMigration";
import {
  APPROVED_INTENT_PHRASES_KEY,
  PENDING_INTENT_CANDIDATES_KEY,
  PROTOCOL_PROMPT_DEFAULT_KEY,
  PROTOCOL_PROMPT_KEY,
  PROTOCOL_RULEBOOK_DEFAULT_KEY,
  PROTOCOL_RULEBOOK_KEY,
  REJECTED_INTENT_CANDIDATES_KEY,
} from "@/lib/app/ui-state/chatPageStorageKeys";

type StorageLike = Pick<Storage, "getItem"> | null;

export type ProtocolIntentSettingsState = {
  pendingIntentCandidates: PendingIntentCandidate[];
  approvedIntentPhrases: ApprovedIntentPhrase[];
  rejectedIntentCandidateSignatures: string[];
  protocolPrompt: string;
  protocolRulebook: string;
};

export function getDefaultProtocolIntentSettingsState(): ProtocolIntentSettingsState {
  return {
    pendingIntentCandidates: [],
    approvedIntentPhrases: [],
    rejectedIntentCandidateSignatures: [],
    protocolPrompt: DEFAULT_PROTOCOL_PROMPT,
    protocolRulebook: DEFAULT_PROTOCOL_RULEBOOK,
  };
}

export function loadProtocolIntentSettingsState(
  storage: StorageLike
): ProtocolIntentSettingsState {
  const initialState = getDefaultProtocolIntentSettingsState();
  if (!storage) {
    return initialState;
  }

  const savedPrompt = storage.getItem(PROTOCOL_PROMPT_KEY);
  const savedRulebook = storage.getItem(PROTOCOL_RULEBOOK_KEY);
  const savedPromptDefault = storage.getItem(PROTOCOL_PROMPT_DEFAULT_KEY);
  const savedRulebookDefault = storage.getItem(PROTOCOL_RULEBOOK_DEFAULT_KEY);
  const savedPendingIntentCandidates = storage.getItem(
    PENDING_INTENT_CANDIDATES_KEY
  );
  const savedApprovedIntentPhrases = storage.getItem(
    APPROVED_INTENT_PHRASES_KEY
  );
  const savedRejectedIntentCandidates = storage.getItem(
    REJECTED_INTENT_CANDIDATES_KEY
  );

  if (savedPendingIntentCandidates) {
    try {
      const parsed = JSON.parse(
        savedPendingIntentCandidates
      ) as PendingIntentCandidate[];
      if (Array.isArray(parsed)) {
        initialState.pendingIntentCandidates =
          parsed.map(normalizePendingIntentCandidate);
      }
    } catch {}
  }

  if (savedApprovedIntentPhrases) {
    try {
      const parsed = JSON.parse(
        savedApprovedIntentPhrases
      ) as ApprovedIntentPhrase[];
      if (Array.isArray(parsed)) {
        initialState.approvedIntentPhrases =
          parsed.map(normalizeApprovedIntentPhrase);
      }
    } catch {}
  }

  if (savedRejectedIntentCandidates) {
    try {
      const parsed = JSON.parse(savedRejectedIntentCandidates) as string[];
      if (Array.isArray(parsed)) {
        initialState.rejectedIntentCandidateSignatures = parsed;
      }
    } catch {}
  }

  initialState.protocolPrompt = migrateLegacyProtocolLimits(
    savedPrompt || savedPromptDefault || DEFAULT_PROTOCOL_PROMPT
  );
  initialState.protocolRulebook = migrateLegacyProtocolLimits(
    savedRulebook || savedRulebookDefault || DEFAULT_PROTOCOL_RULEBOOK
  );

  return initialState;
}
