import type { TaskCountRule } from "@/types/taskProtocol";

export type IntentPhraseKind =
  | "ask_gpt"
  | "ask_user"
  | "search_request"
  | "youtube_transcript_request"
  | "library_reference"
  | "image_library_reference"
  | "ppt_slide_count"
  | "ppt_design_request"
  | "char_limit";

export type ApprovedIntentPhrase = {
  id: string;
  phrase: string;
  kind: IntentPhraseKind;
  count?: number;
  rule?: TaskCountRule;
  charLimit?: number;
  draftText?: string;
  approvedCount?: number;
  rejectedCount?: number;
  createdAt: string;
};

export type PendingIntentCandidate = ApprovedIntentPhrase & {
  sourceText: string;
  draftText?: string;
};

type DraftTextKind =
  | IntentPhraseKind
  | "output_limit"
  | "gpt_request"
  | "library_index_request"
  | "library_item_request"
  | "image_library_reference"
  | "ppt_slide_count";

export const STRONG_APPROVED_INTENT_MATCH_SCORE = 6;

const AT_LEAST_KEYWORDS = [
  "at least",
  "minimum",
  "no less than",
  "not less than",
  "or more",
];
const UP_TO_KEYWORDS = [
  "up to",
  "maximum",
  "max",
  "at most",
  "no more than",
  "not more than",
  "or less",
];
const AROUND_KEYWORDS = ["around", "about", "approximately"];
const EXACT_KEYWORDS = ["exactly"];

function includesAnyKeyword(text: string, keywords: string[]) {
  const lower = text.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}

function extractFirstPositiveNumber(text: string) {
  const match = text.match(/(\d+)/);
  return match?.[1] ? Number(match[1]) : undefined;
}

function detectTaskCountRule(
  text: string,
  fallbackRule: TaskCountRule = "exact"
): TaskCountRule {
  const lower = normalizeLegacyIntentPhraseText(text).toLowerCase();

  if (includesAnyKeyword(lower, AT_LEAST_KEYWORDS)) return "at_least";
  if (includesAnyKeyword(lower, UP_TO_KEYWORDS)) return "up_to";
  if (includesAnyKeyword(lower, AROUND_KEYWORDS)) return "around";
  if (includesAnyKeyword(lower, EXACT_KEYWORDS)) return "exact";
  return fallbackRule;
}

export function normalizeLegacyIntentPhraseText(text: string) {
  return text.normalize("NFKC");
}

export function normalizeApprovedIntentPhrase(
  phrase: ApprovedIntentPhrase
): ApprovedIntentPhrase {
  return {
    ...phrase,
    phrase: normalizeLegacyIntentPhraseText(phrase.phrase),
    draftText: phrase.draftText
      ? normalizeLegacyIntentPhraseText(phrase.draftText)
      : phrase.draftText,
  };
}

export function normalizePendingIntentCandidate(
  candidate: PendingIntentCandidate
): PendingIntentCandidate {
  return {
    ...candidate,
    phrase: normalizeLegacyIntentPhraseText(candidate.phrase),
    sourceText: normalizeLegacyIntentPhraseText(candidate.sourceText),
    draftText: candidate.draftText
      ? normalizeLegacyIntentPhraseText(candidate.draftText)
      : candidate.draftText,
  };
}

export function normalizeApprovedIntentPhraseFromCandidate(
  candidate: PendingIntentCandidate
): ApprovedIntentPhrase {
  const sanitized = normalizePendingIntentCandidate(candidate);
  return {
    id: sanitized.id,
    phrase: sanitized.phrase,
    kind: sanitized.kind,
    count: sanitized.count,
    rule: sanitized.rule,
    charLimit: sanitized.charLimit,
    draftText: sanitized.draftText,
    approvedCount: sanitized.approvedCount,
    rejectedCount: sanitized.rejectedCount,
    createdAt: sanitized.createdAt,
  };
}

export function buildIntentConstraintSignature(
  item: Pick<
    ApprovedIntentPhrase,
    "kind" | "count" | "rule" | "charLimit"
  >
) {
  return [
    item.kind,
    item.count ?? "",
    item.rule ?? "",
    item.charLimit ?? "",
  ].join("|");
}

export function filterPendingIntentCandidatesAgainstApproved(args: {
  pendingIntentCandidates: PendingIntentCandidate[];
  approvedIntentPhrases: ApprovedIntentPhrase[];
}) {
  const approvedSignatures = new Set(
    args.approvedIntentPhrases.map((item) => buildIntentConstraintSignature(item))
  );
  return args.pendingIntentCandidates.filter(
    (item) => !approvedSignatures.has(buildIntentConstraintSignature(item))
  );
}

function isSameApprovedIntentPhrase(
  left: Pick<
    ApprovedIntentPhrase,
    "kind" | "count" | "rule" | "charLimit"
  >,
  right: Pick<
    ApprovedIntentPhrase,
    "kind" | "count" | "rule" | "charLimit"
  >
) {
  return buildIntentConstraintSignature(left) === buildIntentConstraintSignature(right);
}

export function buildNextApprovedIntentPhrasesOnApprove(args: {
  pendingIntentCandidates: PendingIntentCandidate[];
  approvedIntentPhrases: ApprovedIntentPhrase[];
  candidateId: string;
}) {
  const candidate = args.pendingIntentCandidates.find((item) => item.id === args.candidateId);
  if (!candidate) return args.approvedIntentPhrases;
  const normalizedCandidate = normalizeApprovedIntentPhraseFromCandidate(candidate);

  const existing = args.approvedIntentPhrases.find((item) =>
    isSameApprovedIntentPhrase(item, normalizedCandidate)
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
      ? normalizeApprovedIntentPhrase({
          ...item,
          ...args.patch,
        })
      : item
  );
}

export function buildNextApprovedIntentPhrasesOnDelete(args: {
  approvedIntentPhrases: ApprovedIntentPhrase[];
  phraseId: string;
}) {
  return args.approvedIntentPhrases.filter((item) => item.id !== args.phraseId);
}

export function formatIntentCandidateDraftText(candidate: {
  kind: DraftTextKind;
  count?: number;
  rule?: TaskCountRule;
  charLimit?: number;
}) {
  if (
    (candidate.kind === "char_limit" || candidate.kind === "output_limit") &&
    candidate.charLimit
  ) {
    if (candidate.rule === "at_least") {
      return `Please keep the final output at least ${candidate.charLimit} characters.`;
    }
    if (candidate.rule === "around") {
      return `Please summarize the final output around ${candidate.charLimit} characters.`;
    }
    return `Please summarize in up to ${candidate.charLimit} characters.`;
  }

  const count = candidate.count ?? 1;
  const requestRule = candidate.rule ?? "up_to";
  const pluralize = (singular: string, plural: string) =>
    count === 1 ? singular : plural;
  const formatCountInstruction = (verb: string, singular: string, plural: string) => {
    const subject = pluralize(singular, plural);
    if (requestRule === "at_least") {
      return `${verb} at least ${count} ${subject}.`;
    }
    if (requestRule === "exact") {
      return `${verb} exactly ${count} ${subject}.`;
    }
    if (requestRule === "around") {
      return `${verb} around ${count} ${subject}.`;
    }
    return `${verb} up to ${count} ${subject}.`;
  };
  if (candidate.kind === "ask_gpt" || candidate.kind === "gpt_request") {
    return formatCountInstruction("Make", "request to GPT", "requests to GPT");
  }
  if (candidate.kind === "ask_user") {
    return formatCountInstruction("Ask", "question to the user", "questions to the user");
  }
  if (candidate.kind === "search_request") {
    return formatCountInstruction("Perform", "search", "searches");
  }
  if (candidate.kind === "youtube_transcript_request") {
    return formatCountInstruction("Fetch", "YouTube transcript", "YouTube transcripts");
  }
  if (candidate.kind === "library_index_request") {
    return formatCountInstruction("Request", "library data response", "library data responses");
  }
  if (candidate.kind === "library_item_request") {
    return formatCountInstruction("Request", "library data response", "library data responses");
  }
  if (candidate.kind === "library_reference") {
    return formatCountInstruction("Use", "library reference", "library references");
  }
  if (candidate.kind === "image_library_reference") {
    return formatCountInstruction(
      "Use",
      "image-library reference",
      "image-library references"
    );
  }
  if (candidate.kind === "ppt_slide_count") {
    return formatCountInstruction("Create", "PPT slide", "PPT slides");
  }
  if (candidate.kind === "ppt_design_request") {
    return formatCountInstruction("Request", "PPT design work", "PPT design work items");
  }
  return formatCountInstruction("Request", "library data response", "library data responses");
}

export function parseIntentCandidateDraftText(
  text: string,
  fallback: PendingIntentCandidate
): Partial<PendingIntentCandidate> {
  const normalized = normalizeLegacyIntentPhraseText(text).trim();
  const count = extractFirstPositiveNumber(normalized) ?? fallback.count;
  const rule = detectTaskCountRule(normalized, fallback.rule || "exact");
  const lower = normalized.toLowerCase();

  let kind: IntentPhraseKind = fallback.kind;
  if (/final output|summari[sz]e|characters?/.test(lower)) {
    kind = "char_limit";
  } else if (includesAnyKeyword(lower, ["search"])) {
    kind = "search_request";
  } else if (includesAnyKeyword(lower, ["youtube", "transcript"])) {
    kind = "youtube_transcript_request";
  } else if (includesAnyKeyword(lower, ["image-library", "image library"])) {
    kind = "image_library_reference";
  } else if (
    includesAnyKeyword(lower, ["ppt", "powerpoint", "presentation", "slide"]) &&
    includesAnyKeyword(lower, ["create", "slides"])
  ) {
    kind = "ppt_slide_count";
  } else if (includesAnyKeyword(lower, ["library"])) {
    kind = "library_reference";
  } else if (includesAnyKeyword(lower, ["ppt", "powerpoint", "presentation", "slide"])) {
    kind = "ppt_design_request";
  } else if (includesAnyKeyword(lower, ["ask user", "user"])) {
    kind = "ask_user";
  } else if (includesAnyKeyword(lower, ["gpt", "chatgpt"])) {
    kind = "ask_gpt";
  }

  return {
    kind,
    count: kind === "char_limit" ? undefined : count,
    charLimit: kind === "char_limit" ? (count ?? fallback.charLimit) : undefined,
    rule,
    draftText: normalized,
  };
}
