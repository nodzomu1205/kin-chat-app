import type { TaskCountRule, TaskIntent, TaskOutputType } from "@/types/taskProtocol";
import {
  buildTaskIntentFallbackPrompt as buildTaskIntentFallbackPromptClean,
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
  "at most",
  "no more than",
  "not more than",
  "or less",
  "以下",
  "以内",
  "まで",
];
const AROUND_KEYWORDS = ["around", "about", "approximately", "前後", "程度"];
const EXACT_KEYWORDS = ["exactly", "ちょうど", "ぴったり", "正確に"];

function includesAnyKeyword(text: string, keywords: string[]) {
  const lower = text.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
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
  const sanitizedCandidate = normalizePendingIntentCandidate(candidate);
  const normalizedCandidate = {
    ...sanitizedCandidate,
    ...parseIntentCandidateDraftText(
      sanitizedCandidate.draftText || sanitizedCandidate.phrase,
      sanitizedCandidate
    ),
  };

  return {
    id: normalizedCandidate.id,
    phrase: normalizedCandidate.phrase,
    kind: normalizedCandidate.kind,
    count: normalizedCandidate.count,
    rule: normalizedCandidate.rule,
    charLimit: normalizedCandidate.charLimit,
    draftText: normalizedCandidate.draftText,
    approvedCount: normalizedCandidate.approvedCount,
    rejectedCount: normalizedCandidate.rejectedCount,
    createdAt: normalizedCandidate.createdAt,
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
  kind: IntentPhraseKind;
  count?: number;
  rule?: TaskCountRule;
  charLimit?: number;
}) {
  const mode = candidate.rule === "exact" ? "MUST" : "CAN";
  if (candidate.kind === "char_limit" && candidate.charLimit) {
    const clause =
      candidate.rule === "at_least"
        ? `at least ${candidate.charLimit} Japanese characters`
        : candidate.rule === "up_to"
          ? `up to ${candidate.charLimit} Japanese characters`
          : candidate.rule === "exact"
            ? `exactly ${candidate.charLimit} Japanese characters`
            : `around ${candidate.charLimit} Japanese characters`;
    return `${mode} keep final output ${clause}`;
  }

  const label =
    candidate.kind === "ask_gpt"
      ? "ask GPT"
      : candidate.kind === "ask_user"
        ? "ask user"
        : candidate.kind === "search_request"
          ? "search request"
          : candidate.kind === "youtube_transcript_request"
            ? "content request"
            : "library reference";

  const count = candidate.count ?? 1;
  const countClause =
    candidate.rule === "at_least"
      ? `at least ${count} times`
      : candidate.rule === "up_to"
        ? `up to ${count} times`
        : candidate.rule === "around"
          ? `around ${count} times`
          : `exactly ${count} times`;

  return `${mode} ${label} ${countClause}`;
}

export function parseIntentCandidateDraftText(
  text: string,
  fallback: PendingIntentCandidate
): Partial<PendingIntentCandidate> {
  const normalized = normalizeLegacyIntentPhraseText(text).trim();
  const countMatch = normalized.match(/(\d+)/);
  const count = countMatch?.[1] ? Number(countMatch[1]) : fallback.count;

  const rule = detectTaskCountRule(normalized, fallback.rule || "exact");
  const lower = normalized.toLowerCase();
  const kind: IntentPhraseKind = includesAnyKeyword(lower, ASK_GPT_KEYWORDS)
    ? "ask_gpt"
    : includesAnyKeyword(lower, ASK_USER_KEYWORDS)
      ? "ask_user"
      : includesAnyKeyword(lower, [
            "content request",
            "transcript",
            "文字起こし",
            "コンテンツ取得",
          ])
        ? "youtube_transcript_request"
        : includesAnyKeyword(lower, ["library reference", "ライブラリ参照", "資料参照"])
          ? "library_reference"
          : /japanese characters|文字/.test(lower)
            ? "char_limit"
            : includesAnyKeyword(lower, ["search request", "検索", "search"])
              ? "search_request"
              : fallback.kind;

  return {
    kind,
    count: kind === "char_limit" ? undefined : count,
    charLimit: kind === "char_limit" ? count : fallback.charLimit,
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

  for (const phrase of approvedPhrases) {
    const normalizedPhrase = normalizePhraseForMatch(phrase.phrase);
    if (!normalizedPhrase || !normalizedText.includes(normalizedPhrase)) continue;

    if (phrase.kind === "ask_gpt" && phrase.count) {
      next.workflow!.askGptCount = phrase.count;
      next.workflow!.askGptCountRule = phrase.rule || "exact";
    }
    if (phrase.kind === "ask_user" && phrase.count) {
      next.workflow!.askUserCount = phrase.count;
      next.workflow!.askUserCountRule = phrase.rule || "exact";
    }
    if (phrase.kind === "search_request" && phrase.count) {
      next.workflow!.searchRequestCount = phrase.count;
      next.workflow!.searchRequestCountRule = phrase.rule || "exact";
      next.workflow!.allowSearchRequest = true;
    }
    if (phrase.kind === "youtube_transcript_request" && phrase.count) {
      next.workflow!.youtubeTranscriptRequestCount = phrase.count;
      next.workflow!.youtubeTranscriptRequestCountRule = phrase.rule || "exact";
      next.workflow!.allowYoutubeTranscriptRequest = true;
    }
    if (phrase.kind === "library_reference" && phrase.count) {
      next.workflow!.libraryReferenceCount = phrase.count;
      next.workflow!.libraryReferenceCountRule = phrase.rule || "exact";
      next.workflow!.allowLibraryReference = true;
    }
    if (phrase.kind === "char_limit" && phrase.charLimit) {
      const nextConstraints = (next.constraints || []).filter(
        (item) => !/Japanese characters/i.test(item)
      );
      nextConstraints.push(formatCharConstraint(phrase.charLimit, phrase.rule));
      next.constraints = nextConstraints;
    }
  }

  return next;
}

function formatCharConstraint(limit: number, rule: TaskCountRule | undefined) {
  switch (rule) {
    case "exact":
      return `Keep the final output at exactly ${limit} Japanese characters if feasible.`;
    case "at_least":
      return `Keep the final output at or above ${limit} Japanese characters if feasible.`;
    case "up_to":
      return `Keep the final output at or under ${limit} Japanese characters.`;
    case "around":
    default:
      return `Target around ${limit} Japanese characters.`;
  }
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

function asRule(value: unknown): TaskCountRule | null {
  return value === "exact" || value === "at_least" || value === "up_to" || value === "around"
    ? value
    : null;
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
    const item = raw as Record<string, unknown>;
    const kind =
      item.kind === "ask_gpt" ||
      item.kind === "ask_user" ||
      item.kind === "search_request" ||
      item.kind === "youtube_transcript_request" ||
      item.kind === "library_reference" ||
      item.kind === "char_limit"
        ? item.kind
        : null;
    const phrase = typeof item.phrase === "string" ? item.phrase.trim() : "";
    if (!kind || !phrase || !sourceText.includes(phrase)) continue;

    const candidate: PendingIntentCandidate = {
      id: `cand-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      phrase,
      kind,
      count: typeof item.count === "number" && item.count > 0 ? Math.floor(item.count) : undefined,
      rule: asRule(item.rule) || undefined,
      charLimit:
        typeof item.charLimit === "number" && item.charLimit > 0
          ? Math.floor(item.charLimit)
          : undefined,
      createdAt: new Date().toISOString(),
      sourceText,
      draftText:
        typeof item.draftText === "string" && item.draftText.trim()
          ? item.draftText.trim()
          : formatIntentCandidateDraftText({
              kind,
              count:
                typeof item.count === "number" && item.count > 0
                  ? Math.floor(item.count)
                  : undefined,
              rule: asRule(item.rule) || undefined,
              charLimit:
                typeof item.charLimit === "number" && item.charLimit > 0
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
      suggestedTitle: payload.suggestedTitle,
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
