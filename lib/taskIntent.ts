import type { TaskCountRule, TaskIntent, TaskOutputType } from "@/types/taskProtocol";
import {
  buildTaskIntentFallbackPrompt as buildTaskIntentFallbackPromptClean,
  type TaskIntentFallbackCandidate,
  extractTaskIntentFallbackPayload,
} from "@/lib/taskIntentFallback";

type ResponseMode = "strict" | "creative";

type UsageSummary = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type IntentPhraseKind =
  | "ask_gpt"
  | "ask_user"
  | "search_request"
  | "youtube_transcript_request"
  | "library_reference"
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
  | "library_item_request";

export const STRONG_APPROVED_INTENT_MATCH_SCORE = 6;

const SEARCH_KEYWORDS = ["検索", "search", "google"];
const TRANSCRIPT_KEYWORDS = [
  "youtube",
  "文字起こし",
  "動画書き起こし",
  "transcript",
  "content request",
  "コンテンツ取得",
  "動画内容取得",
];
const LIBRARY_KEYWORDS = ["library", "ライブラリ", "保存資料", "資料庫", "資料"];
const MATERIAL_KEYWORDS = ["document", "pdf", "source", "資料", "文書"];
const ASK_GPT_KEYWORDS = ["gpt", "chatgpt", "ask gpt", "gptに質問"];
const ASK_USER_KEYWORDS = [
  "ask user",
  "userに質問",
  "ユーザーに質問",
  "確認して",
  "質問して",
];
const AT_LEAST_KEYWORDS = [
  "at least",
  "minimum",
  "no less than",
  "not less than",
  "or more",
  "以上",
  "最低",
  "少なくとも",
];
const UP_TO_KEYWORDS = [
  "up to",
  "maximum",
  "max",
  "at most",
  "no more than",
  "not more than",
  "or less",
  "以下",
  "以内",
  "まで",
];
const AROUND_KEYWORDS = ["around", "about", "approximately", "前後", "程度", "約", "くらい"];
const EXACT_KEYWORDS = ["exactly", "ちょうど", "ぴったり", "正確に"];

function includesAnyKeyword(text: string, keywords: string[]) {
  const lower = text.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}

function extractFirstPositiveNumber(text: string) {
  const match = text.match(/(\d+)/);
  return match?.[1] ? Number(match[1]) : undefined;
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

function isSameApprovedIntentPhrase(
  left: Pick<
    ApprovedIntentPhrase,
    "kind" | "phrase" | "count" | "rule" | "charLimit"
  >,
  right: Pick<
    ApprovedIntentPhrase,
    "kind" | "phrase" | "count" | "rule" | "charLimit"
  >
) {
  return (
    left.kind === right.kind &&
    left.phrase === right.phrase &&
    left.count === right.count &&
    left.rule === right.rule &&
    left.charLimit === right.charLimit
  );
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
    return formatCountInstruction("Request", "library index entry", "library index entries");
  }
  if (candidate.kind === "library_item_request") {
    return formatCountInstruction("Request", "library content item", "library content items");
  }
  return formatCountInstruction("Request", "library content item", "library content items");
}

export function parseIntentCandidateDraftText(
  text: string,
  fallback: PendingIntentCandidate
): Partial<PendingIntentCandidate> {
  const normalized = normalizeLegacyIntentPhraseText(text).trim();
  const count = extractFirstPositiveNumber(normalized) ?? fallback.count;
  const rule = detectTaskCountRule(normalized, fallback.rule || "exact");
  const lower = normalized.toLowerCase();

  const kind: IntentPhraseKind =
    /final output|summari[sz]e|characters?|文字/.test(lower)
      ? "char_limit"
      : includesAnyKeyword(lower, ["search", "検索"])
        ? "search_request"
        : includesAnyKeyword(lower, ["youtube", "transcript", "文字起こし"])
          ? "youtube_transcript_request"
          : includesAnyKeyword(lower, ["library", "ライブラリ"])
            ? "library_reference"
            : includesAnyKeyword(lower, ["ask user", "user", "ユーザー"])
              ? "ask_user"
              : includesAnyKeyword(lower, ["gpt", "chatgpt"])
                ? "ask_gpt"
                : fallback.kind;

  return {
    kind,
    count: kind === "char_limit" ? undefined : count,
    charLimit: kind === "char_limit" ? (count ?? fallback.charLimit) : undefined,
    rule,
    draftText: normalized,
  };
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
    .replace(/[、。，．,!！?？"'`()[\]{}<>:：;；/\\-]+/g, "")
    .trim();
}

function detectGoal(text: string) {
  return text.replace(/^TASK:\s*/i, "").trim() || "Complete the requested task.";
}

function detectOutputType(text: string): TaskOutputType {
  const lower = text.toLowerCase();
  if (includesAnyKeyword(lower, ["presentation", "プレゼン"])) return "presentation";
  if (includesAnyKeyword(lower, ["comparison", "比較"])) return "comparison";
  if (includesAnyKeyword(lower, ["bullet", "箇条書き"])) return "bullet_list";
  if (includesAnyKeyword(lower, ["reply", "返信"])) return "reply";
  if (includesAnyKeyword(lower, ["summary", "要約"])) return "summary";
  if (includesAnyKeyword(lower, ["analysis", "分析"])) return "analysis";
  return "essay";
}

function detectLanguage(text: string) {
  const lower = text.toLowerCase();
  if (includesAnyKeyword(lower, ["英語", "english"])) return "en";
  if (includesAnyKeyword(lower, ["ロシア語", "russian"])) return "ru";
  return "ja";
}

function detectFinalizationPolicy(
  text: string
): "auto_when_ready" | "wait_for_user_confirm" | "wait_for_required_materials" {
  const lower = text.toLowerCase();
  if (includesAnyKeyword(lower, ["確認してから", "confirm first", "wait for user"])) {
    return "wait_for_user_confirm";
  }
  if (
    includesAnyKeyword(lower, [
      "資料待ち",
      "必要資料",
      "required materials",
      "wait for materials",
    ])
  ) {
    return "wait_for_required_materials";
  }
  return "auto_when_ready";
}

function detectTone(text: string) {
  const lower = text.toLowerCase();
  if (includesAnyKeyword(lower, ["formal", "丁寧", "フォーマル"])) return "formal";
  if (includesAnyKeyword(lower, ["casual", "カジュアル"])) return "casual";
  return undefined;
}

function detectLength(text: string): "short" | "medium" | "long" | undefined {
  const lower = text.toLowerCase();
  if (includesAnyKeyword(lower, ["short", "短い", "短め"])) return "short";
  if (includesAnyKeyword(lower, ["long", "長い", "長め", "詳しく"])) return "long";
  return "medium";
}

function buildBaseTaskIntent(text: string): TaskIntent {
  const normalized = normalizeLegacyIntentPhraseText(text);

  return {
    mode: "task",
    goal: detectGoal(text),
    output: {
      type: detectOutputType(text),
      language: detectLanguage(text),
      tone: detectTone(text),
      length: detectLength(text),
    },
    workflow: {
      allowMaterialRequest: includesAnyKeyword(normalized, MATERIAL_KEYWORDS),
      allowSearchRequest: includesAnyKeyword(normalized, SEARCH_KEYWORDS),
      allowYoutubeTranscriptRequest: includesAnyKeyword(normalized, TRANSCRIPT_KEYWORDS),
      allowLibraryReference: includesAnyKeyword(normalized, LIBRARY_KEYWORDS),
      finalizationPolicy: detectFinalizationPolicy(normalized),
    },
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
    } else if (includesAnyKeyword(normalized, ["search", "検索"])) {
      next.workflow!.allowSearchRequest = true;
      next.workflow!.searchRequestCount =
        count ?? next.workflow!.searchRequestCount;
      next.workflow!.searchRequestCountRule = rule;
    } else if (includesAnyKeyword(normalized, ["youtube", "transcript", "文字起こし"])) {
      next.workflow!.allowYoutubeTranscriptRequest = true;
      next.workflow!.youtubeTranscriptRequestCount =
        count ?? next.workflow!.youtubeTranscriptRequestCount;
      next.workflow!.youtubeTranscriptRequestCountRule = rule;
    } else if (includesAnyKeyword(normalized, ["library", "ライブラリ"])) {
      next.workflow!.allowLibraryReference = true;
      next.workflow!.libraryReferenceCount =
        count ?? next.workflow!.libraryReferenceCount;
      next.workflow!.libraryReferenceCountRule = rule;
    } else if (includesAnyKeyword(normalized, ["user", "ユーザー"])) {
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
    if (
      normalizedPhrase &&
      normalizedText &&
      !normalizedText.includes(normalizedPhrase)
    ) {
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

  next.constraints = [
    ...new Set([...(next.constraints || []), ...approvedConstraintLines]),
  ];

  return applyConstraintWorkflowHints(next);
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

function hasResidualIntentReviewSignal(text: string) {
  return (
    /\d/.test(text) ||
    includesAnyKeyword(text, [
      ...ASK_GPT_KEYWORDS,
      ...ASK_USER_KEYWORDS,
      ...SEARCH_KEYWORDS,
      ...TRANSCRIPT_KEYWORDS,
      ...LIBRARY_KEYWORDS,
      "文字",
      "char",
    ])
  );
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

  return hasResidualIntentReviewSignal(remaining);
}

function buildIntentCandidateKey(candidate: {
  kind: IntentPhraseKind;
  phrase: string;
  count?: number;
  rule?: TaskCountRule;
  charLimit?: number;
}) {
  return [
    candidate.kind,
    candidate.phrase,
    candidate.count ?? "",
    candidate.rule ?? "",
    candidate.charLimit ?? "",
  ].join("::");
}

function buildPendingCandidates(
  parsed: Record<string, unknown>,
  sourceText: string
): PendingIntentCandidate[] {
  if (!Array.isArray(parsed.candidates)) return [];
  const seen = new Set<string>();
  const candidates: PendingIntentCandidate[] = [];

  for (const raw of parsed.candidates) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as TaskIntentFallbackCandidate;
    const phrase = typeof item.phrase === "string" ? item.phrase.trim() : "";
    if (!phrase) continue;

    const kind: IntentPhraseKind =
      item.kind === "output_limit"
        ? "char_limit"
        : item.kind === "gpt_request"
          ? "ask_gpt"
          : item.kind === "search_request"
            ? "search_request"
            : item.kind === "youtube_transcript_request"
              ? "youtube_transcript_request"
              : item.kind === "ask_user"
                ? "ask_user"
                : "library_reference";

    const candidateRule =
      item.rule === "exact" ||
      item.rule === "at_least" ||
      item.rule === "up_to" ||
      item.rule === "around"
        ? item.rule
        : undefined;

    const candidate: PendingIntentCandidate = {
      id: `cand-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      phrase,
      kind,
      count:
        kind === "char_limit"
          ? undefined
          : typeof item.count === "number" && item.count > 0
            ? Math.floor(item.count)
            : undefined,
      rule: candidateRule,
      charLimit:
        kind === "char_limit" &&
        typeof item.charLimit === "number" &&
        item.charLimit > 0
          ? Math.floor(item.charLimit)
          : undefined,
      createdAt: new Date().toISOString(),
      sourceText,
      draftText: formatIntentCandidateDraftText({
        kind: item.kind,
        count:
          kind === "char_limit"
            ? undefined
            : typeof item.count === "number" && item.count > 0
              ? Math.floor(item.count)
              : undefined,
        rule: candidateRule,
        charLimit:
          kind === "char_limit" &&
          typeof item.charLimit === "number" &&
          item.charLimit > 0
            ? Math.floor(item.charLimit)
            : undefined,
      }),
    };

    const key = buildIntentCandidateKey(candidate);
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(candidate);
  }

  return candidates;
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
  responseMode?: ResponseMode;
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

  try {
    const res = await fetch("/api/chatgpt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "chat",
        memory: null,
        recentMessages: [],
        input: buildTaskIntentFallbackPromptClean(text, base),
        instructionMode: "normal",
        reasoningMode: args.responseMode === "creative" ? "creative" : "strict",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        intent: base,
        pendingCandidates: [],
        usedFallback: false,
        usage: null,
        suggestedTitle: null,
      };
    }

    const reply = typeof data?.reply === "string" ? data.reply.trim() : "";
    const payload = extractTaskIntentFallbackPayload(reply);
    if (!payload) {
      return {
        intent: base,
        pendingCandidates: [],
        usedFallback: false,
        usage: data?.usage ?? null,
        suggestedTitle: null,
      };
    }

    return {
      intent: base,
      pendingCandidates: buildPendingCandidates(
        { candidates: payload.candidates as unknown[] },
        text
      ),
      usedFallback: true,
      usage: data?.usage ?? null,
      suggestedTitle: null,
    };
  } catch {
    return {
      intent: base,
      pendingCandidates: [],
      usedFallback: false,
      usage: null,
      suggestedTitle: null,
    };
  }
}

export function looksLikeTaskInstruction(input: string): boolean {
  const text = normalizeText(input);
  return (
    /^TASK:/i.test(text) ||
    includesAnyKeyword(text, [
      "Kinに",
      "タスク",
      "提出",
      "レポート",
      "分析して",
      "まとめて",
      "検索3回",
      "検索",
    ])
  );
}
