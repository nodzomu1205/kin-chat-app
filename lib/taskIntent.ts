import type { TaskCountRule, TaskIntent, TaskOutputType } from "@/types/taskProtocol";

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
  | "char_limit";

export type ApprovedIntentPhrase = {
  id: string;
  phrase: string;
  kind: IntentPhraseKind;
  count?: number;
  rule?: TaskCountRule;
  charLimit?: number;
  createdAt: string;
};

export type PendingIntentCandidate = ApprovedIntentPhrase & {
  sourceText: string;
};

type ParsedRuleAndValue = {
  count?: number;
  rule?: TaskCountRule;
};

function normalizeText(input: string) {
  return input.replace(/\r\n/g, "\n").trim();
}

function normalizePhraseForMatch(input: string) {
  return input
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[、。,.!！?？:：;；"'`´’“”()[\]{}<>＜＞「」『』【】]/g, "")
    .replace(/[はがをにへとでのも]|への|へ/g, "")
    .trim();
}

function splitClauses(text: string) {
  return text
    .split(/[\n。！？!?\r]+/)
    .flatMap((line) => line.split(/[、,]/))
    .map((part) => part.trim())
    .filter(Boolean);
}

function detectRuleFromClause(clause: string, fallback: TaskCountRule = "exact"): TaskCountRule {
  if (/(以上|最低|少なくとも|at least)/i.test(clause)) return "at_least";
  if (/(くらい|ぐらい|程度|前後|about|around)/i.test(clause)) return "around";
  if (/(まで|迄|以内|上限|最大|まで可|までok|までOK|up to|no more than|at most)/i.test(clause)) {
    return "up_to";
  }
  return fallback;
}

function extractCountFromClause(clause: string): number | undefined {
  const match = clause.match(/(\d+)\s*回/);
  if (!match?.[1]) return undefined;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function findMatchingClause(text: string, kind: IntentPhraseKind): string | null {
  const clauses = splitClauses(text);
  const matcher =
    kind === "ask_gpt"
      ? (clause: string) =>
          /gpt/i.test(clause) &&
          /(質問|お願い|依頼|リクエスト|聞いて|聞く|照会|問い合わせ)/.test(clause)
      : kind === "ask_user"
        ? (clause: string) =>
            /(ユーザー|利用者|user)/i.test(clause) &&
            /(質問|確認|聞いて|聞く|問い合わせ)/.test(clause)
        : kind === "search_request"
          ? (clause: string) =>
              /(検索|サーチ|search|google)/i.test(clause) &&
              /(回|して|要求|依頼|リクエスト|使って|行って|実施)/.test(clause)
          : (clause: string) => /\d{3,5}\s*文字/.test(clause);

  return clauses.find(matcher) ?? null;
}

function parseCountClause(text: string, kind: Exclude<IntentPhraseKind, "char_limit">): ParsedRuleAndValue {
  const clause = findMatchingClause(text, kind);
  if (!clause) return {};
  const count = extractCountFromClause(clause);
  if (!count) return {};
  return {
    count,
    rule: detectRuleFromClause(clause, "exact"),
  };
}

function detectCharLimit(text: string): { value?: number; rule?: TaskCountRule; phrase?: string } {
  const clause = findMatchingClause(text, "char_limit");
  const fallbackMatch = text.match(/(\d{3,5})\s*文字(?:以内|まで|迄|くらい|ぐらい|程度|前後)?/);
  const phrase = clause || fallbackMatch?.[0] || undefined;
  if (!phrase) return {};
  const match = phrase.match(/(\d{3,5})\s*文字/);
  if (!match?.[1]) return {};
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return {};
  return {
    value,
    rule: detectRuleFromClause(phrase, "around"),
    phrase,
  };
}

function detectGoal(text: string): string {
  return text.replace(/^TASK:\s*/i, "").replace(/^タスク:\s*/i, "").trim() || "Complete the requested task.";
}

function detectOutputType(text: string): TaskOutputType {
  if (/(プレゼン|presentation)/i.test(text)) return "presentation";
  if (/(比較|compare|comparison)/i.test(text)) return "comparison";
  if (/(箇条書き|bullet)/i.test(text)) return "bullet_list";
  if (/(返信|reply)/i.test(text)) return "reply";
  if (/(要約|summary)/i.test(text)) return "summary";
  if (/(分析|analysis)/i.test(text)) return "analysis";
  return "essay";
}

function detectLanguage(text: string): string {
  if (/(英語|english)/i.test(text)) return "en";
  if (/(ロシア語|russian)/i.test(text)) return "ru";
  return "ja";
}

function detectFinalizationPolicy(
  text: string
): "auto_when_ready" | "wait_for_user_confirm" | "wait_for_required_materials" {
  if (/(ユーザー確認まで待つ|confirm first|wait for user)/i.test(text)) {
    return "wait_for_user_confirm";
  }
  if (/(資料が揃うまで待つ|required materials|wait for materials)/i.test(text)) {
    return "wait_for_required_materials";
  }
  return "auto_when_ready";
}

function detectTone(text: string): string | undefined {
  if (/(フォーマル|formal)/i.test(text)) return "formal";
  if (/(カジュアル|casual)/i.test(text)) return "casual";
  return undefined;
}

function detectLength(text: string): "short" | "medium" | "long" | undefined {
  if (/(短め|short)/i.test(text)) return "short";
  if (/(長め|詳しく|long)/i.test(text)) return "long";
  return "medium";
}

function detectEntities(text: string): string[] {
  const candidates = [
    "ナポレオン",
    "ダヴー",
    "ネイ",
    "ベルティエ",
    "ランヌ",
    "ミュラ",
    "マッセナ",
    "OpenAI API",
    "東京",
    "中野区",
  ];
  return candidates.filter((candidate) => text.includes(candidate));
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

function detectConstraints(text: string): string[] {
  const constraints: string[] = [];
  const charLimit = detectCharLimit(text);
  if (charLimit.value) {
    constraints.push(formatCharConstraint(charLimit.value, charLimit.rule));
  }
  return constraints;
}

function buildBaseTaskIntent(text: string): TaskIntent {
  const askGpt = parseCountClause(text, "ask_gpt");
  const askUser = parseCountClause(text, "ask_user");
  const searchRequest = parseCountClause(text, "search_request");

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
      askGptCount: askGpt.count,
      askGptCountRule: askGpt.rule,
      askUserCount: askUser.count,
      askUserCountRule: askUser.rule,
      searchRequestCount: searchRequest.count,
      searchRequestCountRule: searchRequest.rule,
      allowMaterialRequest: /(資料要求|資料請求|補足資料|document|pdf|source)/i.test(text),
      allowSearchRequest: /(検索|サーチ|search|google)/i.test(text) || Boolean(searchRequest.count),
      finalizationPolicy: detectFinalizationPolicy(text),
    },
    constraints: detectConstraints(text),
    entities: detectEntities(text),
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

    if (phrase.kind === "char_limit" && phrase.charLimit) {
      next.constraints = (next.constraints || []).filter(
        (item) => !/Japanese characters/i.test(item)
      );
      next.constraints.push(formatCharConstraint(phrase.charLimit, phrase.rule));
    }
  }

  return next;
}

function shouldFallbackToLlm(text: string, intent: TaskIntent) {
  const mentionsAskGpt = /gpt/i.test(text) && /(質問|お願い|依頼|リクエスト|聞いて|聞く)/.test(text);
  const mentionsAskUser = /(ユーザー|利用者|user)/i.test(text) && /(質問|確認|聞いて|聞く)/.test(text);
  const mentionsSearch = /(検索|サーチ|search|google)/i.test(text);
  const mentionsCharLimit = /\d{3,5}\s*文字/.test(text);

  if (mentionsAskGpt && (intent.workflow?.askGptCount ?? 0) === 0) return true;
  if (mentionsAskUser && (intent.workflow?.askUserCount ?? 0) === 0) return true;
  if (mentionsSearch && (intent.workflow?.searchRequestCount ?? 0) === 0) return true;
  if (mentionsCharLimit && !(intent.constraints || []).some((item) => /Japanese characters/i.test(item))) {
    return true;
  }
  return false;
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
    '  "askGptCount": number | null,',
    '  "askGptCountRule": "exact" | "at_least" | "up_to" | "around" | null,',
    '  "askUserCount": number | null,',
    '  "askUserCountRule": "exact" | "at_least" | "up_to" | "around" | null,',
    '  "searchRequestCount": number | null,',
    '  "searchRequestCountRule": "exact" | "at_least" | "up_to" | "around" | null,',
    '  "charLimit": number | null,',
    '  "charLimitRule": "exact" | "at_least" | "up_to" | "around" | null,',
    '  "candidates": [',
    '    {',
    '      "phrase": string,',
    '      "kind": "ask_gpt" | "ask_user" | "search_request" | "char_limit",',
    '      "count": number | null,',
    '      "rule": "exact" | "at_least" | "up_to" | "around" | null,',
    '      "charLimit": number | null',
    "    }",
    "  ]",
    "}",
    "",
    "Only extract phrases that literally appear in USER_TEXT.",
    "",
    `BASELINE_ASK_GPT_COUNT: ${baseline.workflow?.askGptCount ?? 0}`,
    `BASELINE_ASK_USER_COUNT: ${baseline.workflow?.askUserCount ?? 0}`,
    `BASELINE_SEARCH_REQUEST_COUNT: ${baseline.workflow?.searchRequestCount ?? 0}`,
    `BASELINE_HAS_CHAR_LIMIT: ${(baseline.constraints || []).some((item) => /Japanese characters/i.test(item)) ? "YES" : "NO"}`,
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

function mergeFallbackIntent(base: TaskIntent, parsed: Record<string, unknown>): TaskIntent {
  const next: TaskIntent = {
    ...base,
    output: { ...base.output },
    workflow: { ...base.workflow },
    constraints: [...(base.constraints || [])],
  };

  const askGptCount =
    typeof parsed.askGptCount === "number" && parsed.askGptCount > 0 ? parsed.askGptCount : null;
  const askUserCount =
    typeof parsed.askUserCount === "number" && parsed.askUserCount > 0 ? parsed.askUserCount : null;
  const searchRequestCount =
    typeof parsed.searchRequestCount === "number" && parsed.searchRequestCount > 0
      ? parsed.searchRequestCount
      : null;
  const charLimit =
    typeof parsed.charLimit === "number" && parsed.charLimit > 0 ? parsed.charLimit : null;

  if ((next.workflow?.askGptCount ?? 0) === 0 && askGptCount) {
    next.workflow!.askGptCount = askGptCount;
    next.workflow!.askGptCountRule = asRule(parsed.askGptCountRule) || "exact";
  }
  if ((next.workflow?.askUserCount ?? 0) === 0 && askUserCount) {
    next.workflow!.askUserCount = askUserCount;
    next.workflow!.askUserCountRule = asRule(parsed.askUserCountRule) || "exact";
  }
  if ((next.workflow?.searchRequestCount ?? 0) === 0 && searchRequestCount) {
    next.workflow!.searchRequestCount = searchRequestCount;
    next.workflow!.searchRequestCountRule = asRule(parsed.searchRequestCountRule) || "exact";
    next.workflow!.allowSearchRequest = true;
  }
  if (charLimit) {
    next.constraints = (next.constraints || []).filter(
      (item) => !/Japanese characters/i.test(item)
    );
    next.constraints.push(formatCharConstraint(charLimit, asRule(parsed.charLimitRule) || "around"));
  }

  return next;
}

function buildPendingCandidates(
  parsed: Record<string, unknown>,
  sourceText: string
): PendingIntentCandidate[] {
  if (!Array.isArray(parsed.candidates)) return [];
  const candidates: PendingIntentCandidate[] = [];

  for (const raw of parsed.candidates) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const kind =
      item.kind === "ask_gpt" ||
      item.kind === "ask_user" ||
      item.kind === "search_request" ||
      item.kind === "char_limit"
        ? item.kind
        : null;
    const phrase = typeof item.phrase === "string" ? item.phrase.trim() : "";
    const rule = asRule(item.rule) || undefined;
    if (!kind || !phrase || !sourceText.includes(phrase)) continue;

    candidates.push({
      id: `cand-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      phrase,
      kind,
      count: typeof item.count === "number" && item.count > 0 ? Math.floor(item.count) : undefined,
      rule,
      charLimit:
        typeof item.charLimit === "number" && item.charLimit > 0
          ? Math.floor(item.charLimit)
          : undefined,
      createdAt: new Date().toISOString(),
      sourceText,
    });
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
}> {
  const text = normalizeText(args.input);
  const approvedPhrases = args.approvedPhrases || [];
  const base = parseTaskIntentFromText(text, approvedPhrases);

  if (!shouldFallbackToLlm(text, base)) {
    return { intent: base, pendingCandidates: [], usedFallback: false, usage: null };
  }

  try {
    const res = await fetch("/api/chatgpt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "chat",
        memory: null,
        recentMessages: [],
        input: buildTaskIntentFallbackPrompt(text, base),
        instructionMode: "normal",
        reasoningMode: args.responseMode === "creative" ? "creative" : "strict",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { intent: base, pendingCandidates: [], usedFallback: false, usage: null };
    }

    const reply = typeof data?.reply === "string" ? data.reply.trim() : "";
    const parsed = tryParseJsonObject(reply);
    if (!parsed) {
      return {
        intent: base,
        pendingCandidates: [],
        usedFallback: false,
        usage: data?.usage ?? null,
      };
    }

    return {
      intent: mergeFallbackIntent(base, parsed),
      pendingCandidates: buildPendingCandidates(parsed, text),
      usedFallback: true,
      usage: data?.usage ?? null,
    };
  } catch {
    return { intent: base, pendingCandidates: [], usedFallback: false, usage: null };
  }
}

export function looksLikeTaskInstruction(input: string): boolean {
  const text = normalizeText(input);
  return (
    /^TASK:/i.test(text) ||
    /^タスク:/i.test(text) ||
    /Kinに/.test(text) ||
    /最終成果物/.test(text) ||
    /(質問|検索|プレゼン|文章|レポート|説明して|まとめて)/.test(text)
  );
}
