import type { TaskCountRule, TaskIntent } from "@/types/taskProtocol";
import {
  buildPendingTaskIntentCandidates,
  requestTaskIntentFallback,
} from "@/lib/taskIntentFallbackRuntime";
import type { ReasoningMode } from "@/lib/app/reasoningMode";
import {
  STRONG_APPROVED_INTENT_MATCH_SCORE,
  filterPendingIntentCandidatesAgainstApproved,
  formatIntentCandidateDraftText,
  normalizeLegacyIntentPhraseText,
  type ApprovedIntentPhrase,
  type PendingIntentCandidate,
} from "@/lib/taskIntentPhraseState";

export {
  STRONG_APPROVED_INTENT_MATCH_SCORE,
  buildNextApprovedIntentPhrasesOnApprove,
  buildNextApprovedIntentPhrasesOnDelete,
  buildNextApprovedIntentPhrasesOnUpdate,
  formatIntentCandidateDraftText,
  normalizeApprovedIntentPhrase,
  normalizeApprovedIntentPhraseFromCandidate,
  normalizeLegacyIntentPhraseText,
  normalizePendingIntentCandidate,
  parseIntentCandidateDraftText,
} from "@/lib/taskIntentPhraseState";
export type {
  ApprovedIntentPhrase,
  IntentPhraseKind,
  PendingIntentCandidate,
} from "@/lib/taskIntentPhraseState";

type UsageSummary = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

const SEARCH_HINT_KEYWORDS = ["search", "検索"];
const TRANSCRIPT_HINT_KEYWORDS = [
  "youtube",
  "transcript",
  "文字起こし",
  "書き起こし",
];
const LIBRARY_HINT_KEYWORDS = ["library", "ライブラリ", "資料", "保存資料"];
const USER_HINT_KEYWORDS = ["user", "ask user", "ユーザー", "確認"];

const AT_LEAST_KEYWORDS = [
  "at least",
  "minimum",
  "no less than",
  "not less than",
  "以上",
];
const UP_TO_KEYWORDS = [
  "up to",
  "maximum",
  "max",
  "at most",
  "no more than",
  "not more than",
  "まで",
  "以下",
];
const AROUND_KEYWORDS = ["around", "about", "approximately", "前後", "くらい"];
const EXACT_KEYWORDS = ["exactly", "ちょうど", "正確に"];

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

function normalizeText(input: string) {
  return input.replace(/\r\n/g, "\n").trim();
}

function normalizePhraseForMatch(input: string) {
  return normalizeLegacyIntentPhraseText(input)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[.,!?;:()[\]{}"'`<>_\-]+/g, "")
    .trim();
}

function detectGoal(text: string) {
  return text.replace(/^TASK:\s*/i, "").trim() || "Complete the requested task.";
}

function buildBaseTaskIntent(text: string): TaskIntent {
  return {
    mode: "task",
    goal: detectGoal(text),
    output: {
      type: "essay",
      language: "ja",
      length: "medium",
    },
    workflow: {},
    constraints: [],
    entities: [],
  };
}

function applyConstraintWorkflowHints(intent: TaskIntent): TaskIntent {
  const next: TaskIntent = {
    ...intent,
    workflow: { ...intent.workflow },
  };

  for (const constraint of intent.constraints || []) {
    const normalized = normalizeLegacyIntentPhraseText(constraint).toLowerCase();
    const count = extractFirstPositiveNumber(normalized);
    const rule = detectTaskCountRule(normalized, "up_to");

    if (includesAnyKeyword(normalized, ["gpt", "chatgpt"])) {
      next.workflow!.askGptCount = count ?? next.workflow!.askGptCount;
      next.workflow!.askGptCountRule = rule;
    } else if (includesAnyKeyword(normalized, SEARCH_HINT_KEYWORDS)) {
      next.workflow!.allowSearchRequest = true;
      next.workflow!.searchRequestCount = count ?? next.workflow!.searchRequestCount;
      next.workflow!.searchRequestCountRule = rule;
    } else if (includesAnyKeyword(normalized, TRANSCRIPT_HINT_KEYWORDS)) {
      next.workflow!.allowYoutubeTranscriptRequest = true;
      next.workflow!.youtubeTranscriptRequestCount =
        count ?? next.workflow!.youtubeTranscriptRequestCount;
      next.workflow!.youtubeTranscriptRequestCountRule = rule;
    } else if (includesAnyKeyword(normalized, LIBRARY_HINT_KEYWORDS)) {
      next.workflow!.allowLibraryReference = true;
      next.workflow!.libraryReferenceCount =
        count ?? next.workflow!.libraryReferenceCount;
      next.workflow!.libraryReferenceCountRule = rule;
    } else if (includesAnyKeyword(normalized, USER_HINT_KEYWORDS)) {
      next.workflow!.askUserCount = count ?? next.workflow!.askUserCount;
      next.workflow!.askUserCountRule = rule;
    }
  }

  return next;
}

function applyApprovedIntentPhrases(
  intent: TaskIntent,
  text: string,
  approvedPhrases: ApprovedIntentPhrase[]
): TaskIntent {
  const next: TaskIntent = {
    ...intent,
    output: { ...intent.output },
    workflow: { ...intent.workflow },
    constraints: [...(intent.constraints || [])],
  };
  const normalizedText = normalizePhraseForMatch(text);
  const approvedConstraintLines = new Set<string>();

  for (const phrase of approvedPhrases) {
    const normalizedPhrase = normalizePhraseForMatch(phrase.phrase);
    if (normalizedPhrase && normalizedText && !normalizedText.includes(normalizedPhrase)) {
      continue;
    }

    const constraintLine =
      (phrase.draftText || "").trim() ||
      formatIntentCandidateDraftText({
        kind: phrase.kind,
        count: phrase.count,
        rule: phrase.rule,
        charLimit: phrase.charLimit,
      });
    if (constraintLine) approvedConstraintLines.add(constraintLine);
  }

  next.constraints = [...new Set([...(next.constraints || []), ...approvedConstraintLines])];
  return applyConstraintWorkflowHints(next);
}

function buildApprovedIntentPhraseMatchScore(
  text: string,
  phrase: ApprovedIntentPhrase
) {
  const normalizedText = normalizePhraseForMatch(text);
  const normalizedPhrase = normalizePhraseForMatch(phrase.phrase);
  if (!normalizedPhrase || !normalizedText.includes(normalizedPhrase)) return 0;

  let score = 4;
  if (text.includes(phrase.phrase)) score += 1;
  if (normalizedPhrase.length >= 8) score += 1;
  score += Math.min(phrase.approvedCount ?? 1, 3);
  score -= Math.min(phrase.rejectedCount ?? 0, 3) * 2;
  return score;
}

function findStrongApprovedIntentPhraseMatches(
  text: string,
  approvedPhrases: ApprovedIntentPhrase[]
) {
  return approvedPhrases.filter(
    (phrase) =>
      buildApprovedIntentPhraseMatchScore(text, phrase) >=
      STRONG_APPROVED_INTENT_MATCH_SCORE
  );
}

function removeFirstPhraseMatch(text: string, phrase: string) {
  const index = text.indexOf(phrase);
  if (index < 0) return text;
  return `${text.slice(0, index)} ${text.slice(index + phrase.length)}`;
}

function normalizeResidualIntentTextForFallback(text: string) {
  return normalizeLegacyIntentPhraseText(text)
    .replace(/\s+/g, " ")
    .replace(/[.,!?;:()[\]{}"'`]+/g, " ")
    .trim();
}

function shouldRunTaskIntentFallback(args: {
  input: string;
  approvedPhrases: ApprovedIntentPhrase[];
}) {
  const normalized = normalizeText(args.input);
  if (!normalized) return false;

  const strongMatches = findStrongApprovedIntentPhraseMatches(
    normalized,
    args.approvedPhrases
  );
  if (strongMatches.length === 0) return true;

  const remaining = strongMatches.reduce(
    (current, phrase) => removeFirstPhraseMatch(current, phrase.phrase),
    normalized
  );

  return normalizeResidualIntentTextForFallback(remaining).length > 0;
}

export function parseTaskIntentFromText(
  input: string,
  approvedPhrases: ApprovedIntentPhrase[] = []
): TaskIntent {
  const text = normalizeText(input);
  const base = buildBaseTaskIntent(text);
  return applyApprovedIntentPhrases(base, text, approvedPhrases);
}

export async function resolveTaskIntentWithFallback(args: {
  input: string;
  approvedPhrases?: ApprovedIntentPhrase[];
  reasoningMode?: ReasoningMode;
}): Promise<{
  intent: TaskIntent;
  pendingCandidates: PendingIntentCandidate[];
  usedFallback: boolean;
  usage: UsageSummary | null;
  suggestedTitle?: string | null;
}> {
  const text = normalizeText(args.input);
  const approvedPhrases = args.approvedPhrases || [];
  const base = parseTaskIntentFromText(text, approvedPhrases);

  if (!shouldRunTaskIntentFallback({ input: text, approvedPhrases })) {
    return {
      intent: base,
      pendingCandidates: [],
      usedFallback: false,
      usage: null,
      suggestedTitle: null,
    };
  }

  const fallback = await requestTaskIntentFallback({
    input: text,
    baseIntent: base,
    reasoningMode: args.reasoningMode,
  });

  if (!fallback.payload) {
    return {
      intent: base,
      pendingCandidates: [],
      usedFallback: false,
      usage: fallback.usage,
      suggestedTitle: null,
    };
  }

  return {
    intent: base,
    pendingCandidates: filterPendingIntentCandidatesAgainstApproved({
      pendingIntentCandidates: buildPendingTaskIntentCandidates({
        payload: fallback.payload,
        sourceText: text,
      }),
      approvedIntentPhrases: approvedPhrases,
    }),
    usedFallback: true,
    usage: fallback.usage,
    suggestedTitle: null,
  };
}
