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
  const normalized = text.normalize("NFKC").trim();
  const countMatch = normalized.match(/(\d+)/);
  const count = countMatch?.[1] ? Number(countMatch[1]) : fallback.count;

  const rule = detectTaskCountRule(normalized, fallback.rule || "exact");

  const kind: IntentPhraseKind =
    /ask gpt/i.test(normalized)
      ? "ask_gpt"
      : /ask user/i.test(normalized)
        ? "ask_user"
        : /content request/i.test(normalized)
          ? "youtube_transcript_request"
          : /library reference/i.test(normalized)
            ? "library_reference"
            : /japanese characters/i.test(normalized)
              ? "char_limit"
              : /search request/i.test(normalized)
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
  const normalized = text.normalize("NFKC");
  if (
    /at least|minimum|no less than|not less than|or more|以上|最低|少なくとも/i.test(
      normalized
    )
  ) {
    return "at_least";
  }
  if (
    /up to|at most|no more than|not more than|or less|以下|以内|まで|迄/i.test(
      normalized
    )
  ) {
    return "up_to";
  }
  if (/around|about|approximately|前後|程度/i.test(normalized)) {
    return "around";
  }
  if (/exactly|ちょうど|ぴったり|正確に/i.test(normalized)) {
    return "exact";
  }
  return fallbackRule;
}

function normalizeText(input: string) {
  return input.replace(/\r\n/g, "\n").trim();
}

function normalizePhraseForMatch(input: string) {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[、。,.!！?？:：;；"'`´’“”()[\]{}<>＜＞「」『』【】]/g, "")
    .replace(/(?:への|へ|は|が|を|に|で|と|も|の)+/g, "")
    .trim();
}

function detectGoal(text: string) {
  return text.replace(/^TASK:\s*/i, "").trim() || "Complete the requested task.";
}

function detectOutputType(text: string): TaskOutputType {
  if (/(?:presentation|プレゼン)/i.test(text)) return "presentation";
  if (/(?:comparison|比較)/i.test(text)) return "comparison";
  if (/(?:bullet|箇条書き)/i.test(text)) return "bullet_list";
  if (/(?:reply|返信)/i.test(text)) return "reply";
  if (/(?:summary|要約)/i.test(text)) return "summary";
  if (/(?:analysis|分析)/i.test(text)) return "analysis";
  return "essay";
}

function detectLanguage(text: string) {
  if (/(?:英語|english)/i.test(text)) return "en";
  if (/(?:ロシア語|russian)/i.test(text)) return "ru";
  return "ja";
}

function detectFinalizationPolicy(
  text: string
): "auto_when_ready" | "wait_for_user_confirm" | "wait_for_required_materials" {
  if (/(?:確認してから|confirm first|wait for user)/i.test(text)) {
    return "wait_for_user_confirm";
  }
  if (/(?:資料待ち|必要資料|required materials|wait for materials)/i.test(text)) {
    return "wait_for_required_materials";
  }
  return "auto_when_ready";
}

function detectTone(text: string) {
  if (/(?:formal|丁寧|フォーマル)/i.test(text)) return "formal";
  if (/(?:casual|カジュアル)/i.test(text)) return "casual";
  return undefined;
}

function detectLength(text: string): "short" | "medium" | "long" | undefined {
  if (/(?:short|短め)/i.test(text)) return "short";
  if (/(?:long|長め|詳しく)/i.test(text)) return "long";
  return "medium";
}

function buildBaseTaskIntent(text: string): TaskIntent {
  const normalized = text.normalize("NFKC");

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
      allowMaterialRequest: /(?:document|pdf|source|資料|原文)/i.test(normalized),
      allowSearchRequest: /(?:検索|search|google)/i.test(normalized),
      allowYoutubeTranscriptRequest: /(?:youtube|動画|文字起こし|transcript|コンテンツ取得|内容取得)/i.test(
        normalized
      ),
      allowLibraryReference: /(?:library|ライブラリ|文献|資料参照)/i.test(normalized),
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
  return /(?:\d|gpt|user|検索|search|google|youtube|動画|文字起こし|transcript|コンテンツ取得|内容取得|library|ライブラリ|文献|資料|文字)/i.test(
    text
  );
}

export function buildApprovedIntentPhraseMatchScore(
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

export function findBestApprovedIntentPhraseMatchWithScore(
  text: string,
  approvedPhrases: ApprovedIntentPhrase[]
) {
  let best:
    | {
        phrase: ApprovedIntentPhrase | null;
        score: number;
      }
    | undefined;

  for (const phrase of approvedPhrases) {
    const score = buildApprovedIntentPhraseMatchScore(text, phrase);
    if (!best || score > best.score) {
      best = { phrase, score };
    }
  }

  return best || { phrase: null, score: 0 };
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

function tryParseJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {}

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(trimmed.slice(start, end + 1));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {}
  }
  return null;
}

function buildTaskIntentFallbackPrompt(input: string, baseline: TaskIntent) {
  return [
    "You are a task-intent parser.",
    "Read the user's Japanese instruction and return JSON only.",
    "No markdown. No explanation. No code fences.",
    "",
    "Return this JSON shape:",
    "{",
    '  "suggestedTitle": string | null,',
    '  "candidates": [',
    "    {",
      '      "phrase": string,',
    '      "draftText": string,',
      '      "kind": "ask_gpt" | "ask_user" | "search_request" | "youtube_transcript_request" | "library_reference" | "char_limit",',
    '      "count": number | null,',
    '      "rule": "exact" | "at_least" | "up_to" | "around" | null,',
    '      "charLimit": number | null',
    "    }",
    "  ]",
    "}",
    "",
    "Only extract phrases that literally appear in USER_TEXT.",
    "Do not infer values that are not explicitly stated.",
    'Set "draftText" to a user-editable protocol phrase like "CAN search request up to 3 times".',
    'Interpret "コンテンツ取得5回迄" or similar as kind "youtube_transcript_request" with rule "up_to".',
    'Interpret "1000文字以上" or similar as kind "char_limit" with rule "at_least". Never change "以上" into "exact".',
    'Set "suggestedTitle" to a short clear task title extracted from USER_TEXT.',
    "",
    `BASELINE_ALLOW_SEARCH_REQUEST: ${baseline.workflow?.allowSearchRequest ? "YES" : "NO"}`,
    `BASELINE_ALLOW_YOUTUBE_TRANSCRIPT_REQUEST: ${baseline.workflow?.allowYoutubeTranscriptRequest ? "YES" : "NO"}`,
    `BASELINE_ALLOW_LIBRARY_REFERENCE: ${baseline.workflow?.allowLibraryReference ? "YES" : "NO"}`,
    "USER_TEXT_START",
    input,
    "USER_TEXT_END",
  ].join("\n");
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

function buildDeterministicIntentCandidate(params: {
  sourceText: string;
  phrase: string;
  kind: IntentPhraseKind;
  count?: number;
  charLimit?: number;
  rule: TaskCountRule;
}): PendingIntentCandidate {
  return {
    id: `cand-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    phrase: params.phrase,
    kind: params.kind,
    count: params.kind === "char_limit" ? undefined : params.count,
    charLimit: params.kind === "char_limit" ? params.charLimit : undefined,
    rule: params.rule,
    createdAt: new Date().toISOString(),
    sourceText: params.sourceText,
    draftText: formatIntentCandidateDraftText({
      kind: params.kind,
      count: params.count,
      charLimit: params.charLimit,
      rule: params.rule,
    }),
  };
}

function extractExplicitIntentCandidatesFromText(sourceText: string): PendingIntentCandidate[] {
  const normalized = sourceText.normalize("NFKC");
  const candidates: PendingIntentCandidate[] = [];
  const seen = new Set<string>();

  const addCandidate = (candidate: PendingIntentCandidate) => {
    const key = buildIntentCandidateKey(candidate);
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(candidate);
  };

  for (const match of normalized.matchAll(/((?:検索|search)\s*(\d+)\s*回(?:まで|迄|以内|以下)?)/gi)) {
    const phrase = match[1]?.trim();
    const count = Number(match[2]);
    if (!phrase || !count) continue;
    addCandidate(
      buildDeterministicIntentCandidate({
        sourceText,
        phrase,
        kind: "search_request",
        count,
        rule: detectTaskCountRule(phrase, "up_to"),
      })
    );
  }

  for (
    const match of normalized.matchAll(
      /((?:コンテンツ取得|内容取得|文字起こし取得|文字起こし|transcript request|content request)\s*(\d+)\s*回(?:まで|迄|以内|以下)?)/gi
    )
  ) {
    const phrase = match[1]?.trim();
    const count = Number(match[2]);
    if (!phrase || !count) continue;
    addCandidate(
      buildDeterministicIntentCandidate({
        sourceText,
        phrase,
        kind: "youtube_transcript_request",
        count,
        rule: detectTaskCountRule(phrase, "up_to"),
      })
    );
  }

  for (
    const match of normalized.matchAll(
      /((\d+)\s*文字(?:以上|以下|以内|程度|前後|ちょうど|ぴったり))/gi
    )
  ) {
    const phrase = match[1]?.trim();
    const charLimit = Number(match[2]);
    if (!phrase || !charLimit) continue;
    addCandidate(
      buildDeterministicIntentCandidate({
        sourceText,
        phrase,
        kind: "char_limit",
        charLimit,
        rule: detectTaskCountRule(phrase, "exact"),
      })
    );
  }

  return candidates;
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

function mergePendingCandidates(
  sourceText: string,
  llmCandidates: PendingIntentCandidate[]
): PendingIntentCandidate[] {
  const merged = [...llmCandidates];
  const seen = new Set(llmCandidates.map((candidate) => buildIntentCandidateKey(candidate)));

  for (const candidate of extractExplicitIntentCandidatesFromText(sourceText)) {
    const key = buildIntentCandidateKey(candidate);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(candidate);
  }

  return merged;
}

void tryParseJsonObject;
void buildTaskIntentFallbackPrompt;
void mergePendingCandidates;

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
    /(?:Kinに|タスク|依頼|レポート|分析して|まとめて|提出して|検索\d+回|文字\d+)/i.test(text)
  );
}
