import type { KinBlockMode } from "@/lib/app/kin-protocol/kinStructuredProtocol";
import type { ReasoningMode } from "@/lib/app/task-runtime/reasoningMode";

type UsageSummary = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type TransformIntent = {
  mode: KinBlockMode;
  rawDirective: string;
  cleanedDirective: string;
  directiveLines: string[];
  extraDirectiveLines: string[];

  translateTo?: string;
  finalOutputLanguage?: string;
  summarize: boolean;
  bulletize: boolean;
  preserveAllText: boolean;
  exact: boolean;

  focusQuery?: string;
  extractOnly: boolean;
  includeTopics: string[];
  excludeTopics: string[];

  tone?: string;
  formality?: "very_formal" | "formal" | "neutral" | "casual" | "very_casual";
  dialect?: string;
  persona?: string;
  audience?: string;

  outputFormat?:
    | "plain_text"
    | "bullets"
    | "numbered_list"
    | "table"
    | "json"
    | "markdown";
  maxLength?: string;
  minLength?: string;
  structureHint?: string;
  keepQuotes: boolean;

  allowRevision: boolean;
  requireDifferentSelection: boolean;
  preferLatestMaterial: boolean;
};

type PartialIntentPayload = Partial<TransformIntent> & {
  mode?: KinBlockMode;
};

function normalizeDirectiveText(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function sanitizeDirectiveLine(line: string): string {
  return line.replace(/^(INFO|SYS_INFO|TASK|SYS_TASK)\s*[:：]\s*/i, "").trim();
}

function hasExplicitModePrefix(input: string): boolean {
  return /^(?:\s*)(INFO|SYS_INFO|TASK|SYS_TASK)\s*[:：]/i.test(input);
}

function parsePrefixedMode(
  input: string,
  defaultMode: KinBlockMode
): { mode: KinBlockMode; body: string; explicitMode: boolean } {
  const lines = input.split(/\r?\n/);
  const firstNonEmptyIndex = lines.findIndex((line) => line.trim().length > 0);

  if (firstNonEmptyIndex < 0) {
    return { mode: defaultMode, body: "", explicitMode: false };
  }

  const firstLine = lines[firstNonEmptyIndex].trim();
  const match = firstLine.match(/^(INFO|SYS_INFO|TASK|SYS_TASK)\s*[:：]\s*(.*)$/i);

  if (!match) {
    return {
      mode: defaultMode,
      body: normalizeDirectiveText(input),
      explicitMode: false,
    };
  }

  const prefix = match[1].toUpperCase();
  const remainder = match[2]?.trim() || "";
  const restLines = lines.slice(firstNonEmptyIndex + 1);

  return {
    mode: prefix.includes("TASK") ? "sys_task" : "sys_info",
    body: normalizeDirectiveText([remainder, ...restLines].join("\n")),
    explicitMode: true,
  };
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function coerceMode(value: unknown, fallback: KinBlockMode): KinBlockMode {
  return value === "sys_task" || value === "sys_info" ? value : fallback;
}

function coerceOutputFormat(value: unknown): TransformIntent["outputFormat"] {
  const allowed = new Set([
    "plain_text",
    "bullets",
    "numbered_list",
    "table",
    "json",
    "markdown",
  ]);
  return typeof value === "string" && allowed.has(value)
    ? (value as TransformIntent["outputFormat"])
    : undefined;
}

function coerceFormality(value: unknown): TransformIntent["formality"] {
  const allowed = new Set([
    "very_formal",
    "formal",
    "neutral",
    "casual",
    "very_casual",
  ]);
  return typeof value === "string" && allowed.has(value)
    ? (value as TransformIntent["formality"])
    : undefined;
}

function looksLikeRevisionDirective(line: string): boolean {
  return /変更|差し替|入れ替|再選|再選定|見直し|上書き|更新|override|replace|revise|reselect/i.test(
    line
  );
}

function looksLikeDifferentSelectionDirective(line: string): boolean {
  return /必ず変更|必ず差し替|以前と別|前回と別|同じ.*不可|別の.*選|different|must not keep|discard previous|replace previous/i.test(
    line
  );
}

function looksLikeLatestMaterialDirective(line: string): boolean {
  return /最新|追加資料|追加の資料|新資料|新しい資料|新たに投入|後から投入|later input|latest material|new material/i.test(
    line
  );
}

function detectTranslateTarget(line: string): string | undefined {
  if (/英語|english/i.test(line)) return "English";
  if (/日本語|japanese|和訳/i.test(line)) return "Japanese";
  if (/ロシア語|russian|русск/i.test(line)) return "Russian";
  if (/イタリア語|italian|italiano/i.test(line)) return "Italian";
  if (/フランス語|french/i.test(line)) return "French";
  if (/ドイツ語|german/i.test(line)) return "German";
  if (/スペイン語|spanish/i.test(line)) return "Spanish";
  if (/中国語|chinese/i.test(line)) return "Chinese";
  if (/韓国語|korean/i.test(line)) return "Korean";
  return undefined;
}

function stripLanguageMarkers(text: string): string {
  return text
    .replace(
      /\b(?:英語|日本語|ロシア語|イタリア語|フランス語|ドイツ語|スペイン語|中国語|韓国語|english|japanese|russian|italian|french|german|spanish|chinese|korean)\b/gi,
      ""
    )
    .replace(/\b(?:で|to|into)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanFocusPhrase(text: string): string {
  return stripLanguageMarkers(text)
    .replace(/(?:に関して|について|のみ|だけ)$/g, "")
    .replace(/[、,。．.!！]+$/g, "")
    .trim();
}

function extractFocusQuery(line: string): string | undefined {
  const patterns = [
    /(.+?)\s*(?:に関して|について)?\s*(?:のみ|だけ)\s*(?:を)?\s*(?:英語|日本語|ロシア語|イタリア語|フランス語|ドイツ語|スペイン語|中国語|韓国語|english|japanese|russian|italian|french|german|spanish|chinese|korean)?\s*(?:で)?\s*(?:抜き出|抽出|取り出|拾い出)して/i,
    /(.+?)\s*(?:を)?\s*(?:英語|日本語|ロシア語|イタリア語|フランス語|ドイツ語|スペイン語|中国語|韓国語|english|japanese|russian|italian|french|german|spanish|chinese|korean)?\s*(?:で)?\s*(?:抜き出|抽出|取り出|拾い出)して/i,
    /only\s+(?:extract|pull out|list)\s+(.+)/i,
    /extract\s+only\s+(.+)/i,
    /focus\s+only\s+on\s+(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    const value = match?.[1]?.trim();
    if (value) {
      const cleaned = cleanFocusPhrase(value);
      if (cleaned) return cleaned;
    }
  }

  return undefined;
}

function extractMaxLength(line: string): string | undefined {
  const match =
    line.match(/(\d+)\s*(字|文字|tokens?|トークン|words?)(?:以内)?/i) ||
    line.match(/(within|under|less than)\s+(\d+\s*(?:words?|tokens?))/i);
  if (!match) return undefined;
  return match[0].trim();
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

function buildDefaultIntent(
  input: string,
  defaultMode: KinBlockMode
): TransformIntent {
  const { mode, body } = parsePrefixedMode(input, defaultMode);
  const cleanedDirective = normalizeDirectiveText(body);
  const directiveLines = cleanedDirective
    .split(/\r?\n/)
    .map((line) => sanitizeDirectiveLine(line))
    .filter(Boolean);

  let translateTo: string | undefined;
  let summarize = false;
  let bulletize = false;
  let preserveAllText = false;
  let exact = false;
  let finalOutputLanguage: string | undefined;
  let allowRevision = false;
  let requireDifferentSelection = false;
  let preferLatestMaterial = false;
  let focusQuery: string | undefined;
  let extractOnly = false;
  let tone: string | undefined;
  let formality: TransformIntent["formality"];
  let dialect: string | undefined;
  let persona: string | undefined;
  let audience: string | undefined;
  let outputFormat: TransformIntent["outputFormat"];
  let maxLength: string | undefined;
  let structureHint: string | undefined;
  let keepQuotes = false;
  const includeTopics: string[] = [];
  const excludeTopics: string[] = [];
  const extraDirectiveLines: string[] = [];

  directiveLines.forEach((line) => {
    const lower = line.toLowerCase();
    const mentionsOutput =
      /アウトプット|output|reply|response|返答|返事|最終/.test(line);

    const language = detectTranslateTarget(line);
    if (language) {
      translateTo = language;
      if (mentionsOutput) finalOutputLanguage = language;
    }

    if (/要約|サマリ|サマリー|summary|summar/i.test(line)) summarize = true;
    if (/箇条書|bullet/i.test(line)) {
      bulletize = true;
      outputFormat = outputFormat || "bullets";
    }
    if (/番号付き|numbered/i.test(line)) outputFormat = "numbered_list";
    if (/表にして|table/i.test(line)) outputFormat = "table";
    if (/json/i.test(line)) outputFormat = "json";
    if (/markdown/i.test(line)) outputFormat = "markdown";

    if (/全文|全ての文字|すべての文字|漏れなく|原文|完全版/.test(line)) {
      preserveAllText = true;
    }

    if (/正確|厳密|exact|verbatim/i.test(lower)) exact = true;
    if (/引用維持|引用は残して|keep quotes|preserve quotes/i.test(line)) {
      keepQuotes = true;
    }

    if (/かなりフォーマル|very formal/i.test(line)) formality = "very_formal";
    else if (/フォーマル|formal/i.test(line)) formality = "formal";
    else if (/かなりカジュアル|very casual/i.test(line)) formality = "very_casual";
    else if (/カジュアル|casual/i.test(line)) formality = "casual";

    if (/関西弁|kansai/i.test(line)) {
      dialect = "Kansai dialect";
      tone = tone || "friendly";
    }
    if (/敬語/i.test(line)) tone = "polite";
    if (/柔らか|soft/i.test(line)) tone = "soft";
    if (/強め|strong/i.test(line)) tone = "strong";
    if (/ビジネス/i.test(line)) audience = "business";
    if (/初心者向け/i.test(line)) audience = "beginner";
    if (/専門家向け/i.test(line)) audience = "expert";
    if (/先生風|teacher/i.test(line)) persona = "teacher";
    if (/秘書風|assistant/i.test(line)) persona = "assistant";

    if (looksLikeRevisionDirective(line)) allowRevision = true;
    if (looksLikeDifferentSelectionDirective(line)) {
      requireDifferentSelection = true;
      allowRevision = true;
    }
    if (looksLikeLatestMaterialDirective(line)) preferLatestMaterial = true;

    const extractedFocus = extractFocusQuery(line);
    if (extractedFocus) {
      focusQuery = extractedFocus;
      extractOnly = true;
      includeTopics.push(extractedFocus);
    }

    const extractedMax = extractMaxLength(line);
    if (extractedMax) maxLength = extractedMax;

    if (/結論先|結論から|start with conclusion/i.test(line)) {
      structureHint = "Start with the conclusion.";
    }

    const excludeMatch = line.match(/(?:除外|省いて|without|exclude)\s+(.+)/i);
    if (excludeMatch?.[1]?.trim()) {
      excludeTopics.push(excludeMatch[1].trim());
    }

    const includeMatch = line.match(/(?:含めて|include)\s+(.+)/i);
    if (includeMatch?.[1]?.trim()) {
      includeTopics.push(includeMatch[1].trim());
    }

    const isPureTransformInstruction =
      /英語|english|日本語|japanese|和訳|ロシア語|russian|русск|イタリア語|italian|italiano|要約|サマリ|サマリー|summary|summar|箇条書|bullet|全文|全ての文字|すべての文字|漏れなく|原文|完全版|正確|厳密|exact|verbatim|フォーマル|formal|カジュアル|casual|関西弁|kansai|json|markdown|表にして|table/.test(
        line
      ) && !mentionsOutput && !extractedFocus;

    if (!isPureTransformInstruction || mentionsOutput) {
      extraDirectiveLines.push(line);
    }
  });

  return {
    mode,
    rawDirective: input,
    cleanedDirective,
    directiveLines,
    extraDirectiveLines,
    translateTo,
    summarize,
    bulletize,
    preserveAllText,
    exact,
    finalOutputLanguage,
    allowRevision,
    requireDifferentSelection,
    preferLatestMaterial,
    focusQuery,
    extractOnly,
    includeTopics: Array.from(new Set(includeTopics)),
    excludeTopics: Array.from(new Set(excludeTopics)),
    tone,
    formality,
    dialect,
    persona,
    audience,
    outputFormat,
    maxLength,
    minLength: undefined,
    structureHint,
    keepQuotes,
  };
}

function mergeIntent(
  base: TransformIntent,
  patch: PartialIntentPayload | null | undefined,
  explicitModeLocked: boolean
): TransformIntent {
  if (!patch) return base;

  const merged: TransformIntent = {
    ...base,
    ...patch,
    mode: explicitModeLocked ? base.mode : coerceMode(patch.mode, base.mode),
    translateTo:
      typeof patch.translateTo === "string" && patch.translateTo.trim()
        ? patch.translateTo.trim()
        : base.translateTo,
    finalOutputLanguage:
      typeof patch.finalOutputLanguage === "string" &&
      patch.finalOutputLanguage.trim()
        ? patch.finalOutputLanguage.trim()
        : base.finalOutputLanguage,
    focusQuery:
      typeof patch.focusQuery === "string" && patch.focusQuery.trim()
        ? patch.focusQuery.trim()
        : base.focusQuery,
    includeTopics:
      parseStringArray(patch.includeTopics).length > 0
        ? Array.from(new Set([...base.includeTopics, ...parseStringArray(patch.includeTopics)]))
        : base.includeTopics,
    excludeTopics:
      parseStringArray(patch.excludeTopics).length > 0
        ? Array.from(new Set([...base.excludeTopics, ...parseStringArray(patch.excludeTopics)]))
        : base.excludeTopics,
    extraDirectiveLines:
      parseStringArray(patch.extraDirectiveLines).length > 0
        ? Array.from(
            new Set([...base.extraDirectiveLines, ...parseStringArray(patch.extraDirectiveLines)])
          )
        : base.extraDirectiveLines,
    tone:
      typeof patch.tone === "string" && patch.tone.trim()
        ? patch.tone.trim()
        : base.tone,
    formality: coerceFormality(patch.formality) || base.formality,
    dialect:
      typeof patch.dialect === "string" && patch.dialect.trim()
        ? patch.dialect.trim()
        : base.dialect,
    persona:
      typeof patch.persona === "string" && patch.persona.trim()
        ? patch.persona.trim()
        : base.persona,
    audience:
      typeof patch.audience === "string" && patch.audience.trim()
        ? patch.audience.trim()
        : base.audience,
    outputFormat: coerceOutputFormat(patch.outputFormat) || base.outputFormat,
    maxLength:
      typeof patch.maxLength === "string" && patch.maxLength.trim()
        ? patch.maxLength.trim()
        : base.maxLength,
    minLength:
      typeof patch.minLength === "string" && patch.minLength.trim()
        ? patch.minLength.trim()
        : base.minLength,
    structureHint:
      typeof patch.structureHint === "string" && patch.structureHint.trim()
        ? patch.structureHint.trim()
        : base.structureHint,
    keepQuotes:
      typeof patch.keepQuotes === "boolean" ? patch.keepQuotes : base.keepQuotes,
    summarize:
      typeof patch.summarize === "boolean" ? patch.summarize : base.summarize,
    bulletize:
      typeof patch.bulletize === "boolean" ? patch.bulletize : base.bulletize,
    preserveAllText:
      typeof patch.preserveAllText === "boolean"
        ? patch.preserveAllText
        : base.preserveAllText,
    exact: typeof patch.exact === "boolean" ? patch.exact : base.exact,
    extractOnly:
      typeof patch.extractOnly === "boolean" ? patch.extractOnly : base.extractOnly,
    allowRevision:
      typeof patch.allowRevision === "boolean"
        ? patch.allowRevision
        : base.allowRevision,
    requireDifferentSelection:
      typeof patch.requireDifferentSelection === "boolean"
        ? patch.requireDifferentSelection
        : base.requireDifferentSelection,
    preferLatestMaterial:
      typeof patch.preferLatestMaterial === "boolean"
        ? patch.preferLatestMaterial
        : base.preferLatestMaterial,
  };

  return merged;
}

function buildIntentParserPrompt(
  input: string,
  defaultMode: KinBlockMode
): string {
  return [
    "You are an intent parser for a text transformation system.",
    "Read the user's instruction and return JSON only.",
    "No markdown. No explanation. No code fences.",
    "",
    "Important rules:",
    "1. If the user combines multiple directives in a single sentence, preserve ALL of them.",
    '2. Example: "マッセナに関してのみロシア語で抜き出して" means focusQuery="マッセナ", extractOnly=true, translateTo="Russian".',
    '3. Example: "TASK: ダヴーに関する部分だけ英語で箇条書き" means mode="sys_task", focusQuery="ダヴー", extractOnly=true, translateTo="English", bulletize=true, outputFormat="bullets".',
    "4. If the user explicitly uses INFO: / SYS_INFO: / TASK: / SYS_TASK:, preserve that mode.",
    "5. Do not drop a language/style/format directive just because extraction is also requested.",
    "",
    "Return an object with these keys:",
    "{",
    '  "mode": "sys_info" | "sys_task",',
    '  "translateTo": string | null,',
    '  "finalOutputLanguage": string | null,',
    '  "summarize": boolean,',
    '  "bulletize": boolean,',
    '  "preserveAllText": boolean,',
    '  "exact": boolean,',
    '  "focusQuery": string | null,',
    '  "extractOnly": boolean,',
    '  "includeTopics": string[],',
    '  "excludeTopics": string[],',
    '  "tone": string | null,',
    '  "formality": "very_formal" | "formal" | "neutral" | "casual" | "very_casual" | null,',
    '  "dialect": string | null,',
    '  "persona": string | null,',
    '  "audience": string | null,',
    '  "outputFormat": "plain_text" | "bullets" | "numbered_list" | "table" | "json" | "markdown" | null,',
    '  "maxLength": string | null,',
    '  "minLength": string | null,',
    '  "structureHint": string | null,',
    '  "keepQuotes": boolean,',
    '  "allowRevision": boolean,',
    '  "requireDifferentSelection": boolean,',
    '  "preferLatestMaterial": boolean,',
    '  "extraDirectiveLines": string[]',
    "}",
    "",
    `DEFAULT_MODE: ${defaultMode}`,
    "USER_DIRECTIVE_START",
    input,
    "USER_DIRECTIVE_END",
  ].join("\n");
}

export function parseTransformIntent(
  input: string,
  defaultMode: KinBlockMode
): TransformIntent {
  return buildDefaultIntent(input, defaultMode);
}

export async function resolveTransformIntent(args: {
  input: string;
  defaultMode: KinBlockMode;
  reasoningMode?: ReasoningMode;
}): Promise<{ intent: TransformIntent; usage: UsageSummary | null }> {
  const base = buildDefaultIntent(args.input, args.defaultMode);
  const explicitModeLocked = hasExplicitModePrefix(args.input);

  if (!normalizeDirectiveText(args.input)) {
    return { intent: base, usage: null };
  }

  try {
    const res = await fetch("/api/chatgpt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "chat",
        memory: null,
        recentMessages: [],
        input: buildIntentParserPrompt(args.input, args.defaultMode),
        instructionMode: "normal",
        reasoningMode: args.reasoningMode === "strict" ? "strict" : "creative",
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { intent: base, usage: null };
    }

    const reply =
      typeof data?.reply === "string" && data.reply.trim() ? data.reply.trim() : "";

    const parsed = tryParseJsonObject(reply);
    const intent = mergeIntent(
      base,
      parsed as PartialIntentPayload | null,
      explicitModeLocked
    );

    return {
      intent,
      usage: data?.usage ?? null,
    };
  } catch {
    return { intent: base, usage: null };
  }
}

export function shouldTransformContent(intent: TransformIntent): boolean {
  return Boolean(
    intent.translateTo ||
      intent.summarize ||
      intent.bulletize ||
      intent.preserveAllText ||
      intent.exact ||
      intent.focusQuery ||
      intent.extractOnly ||
      intent.includeTopics.length > 0 ||
      intent.excludeTopics.length > 0 ||
      intent.tone ||
      intent.formality ||
      intent.dialect ||
      intent.persona ||
      intent.audience ||
      intent.outputFormat ||
      intent.maxLength ||
      intent.minLength ||
      intent.structureHint ||
      intent.keepQuotes
  );
}

export function buildKinDirectiveLines(intent: TransformIntent): string[] {
  const lines: string[] = [];

  if (intent.finalOutputLanguage) {
    lines.push(
      `Final user-facing output must be in ${intent.finalOutputLanguage}.`
    );
  }

  if (intent.summarize) {
    lines.push("Keep the final output concise and well-structured.");
  }

  if (intent.bulletize) {
    lines.push("Use bullet points when helpful.");
  }

  if (intent.outputFormat === "numbered_list") {
    lines.push("Use a numbered list.");
  }

  if (intent.outputFormat === "table") {
    lines.push("Prefer a table if it fits naturally.");
  }

  if (intent.outputFormat === "json") {
    lines.push("Return JSON only.");
  }

  if (intent.outputFormat === "markdown") {
    lines.push("Use clean markdown formatting.");
  }

  if (intent.preserveAllText) {
    lines.push("Preserve all important details from the source material.");
  }

  if (intent.exact) {
    lines.push("Prioritize accuracy over style.");
  }

  if (intent.preferLatestMaterial) {
    lines.push("Prefer the newest provided material over older drafts or earlier assumptions.");
  }

  if (intent.allowRevision) {
    lines.push("Previous conclusions are revisable and are not binding.");
  }

  if (intent.requireDifferentSelection) {
    lines.push("If the latest instruction asks for a different selection, you must discard the previous selection and choose a different one.");
  }

  if (intent.focusQuery) {
    lines.push(`Focus only on: ${intent.focusQuery}.`);
  }

  if (intent.extractOnly) {
    lines.push("Extract only the requested portion from the source material.");
  }

  if (intent.includeTopics.length > 0) {
    lines.push(`Include topics: ${intent.includeTopics.join(", ")}.`);
  }

  if (intent.excludeTopics.length > 0) {
    lines.push(`Exclude topics: ${intent.excludeTopics.join(", ")}.`);
  }

  if (intent.tone) {
    lines.push(`Preferred tone: ${intent.tone}.`);
  }

  if (intent.formality) {
    lines.push(`Preferred formality: ${intent.formality}.`);
  }

  if (intent.dialect) {
    lines.push(`Preferred dialect: ${intent.dialect}.`);
  }

  if (intent.persona) {
    lines.push(`Adopt this persona if appropriate: ${intent.persona}.`);
  }

  if (intent.audience) {
    lines.push(`Target audience: ${intent.audience}.`);
  }

  if (intent.maxLength) {
    lines.push(`Maximum length target: ${intent.maxLength}.`);
  }

  if (intent.minLength) {
    lines.push(`Minimum length target: ${intent.minLength}.`);
  }

  if (intent.structureHint) {
    lines.push(intent.structureHint);
  }

  if (intent.keepQuotes) {
    lines.push("Preserve meaningful original quotations when possible.");
  }

  intent.extraDirectiveLines.forEach((line) => {
    if (!lines.includes(line)) {
      lines.push(line);
    }
  });

  return lines;
}

export function buildTaskExecutionInstruction(
  baseInstruction: string,
  intent: TransformIntent
): string {
  const lines = normalizeDirectiveText(baseInstruction)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  lines.push("最新のユーザー指示と最新に追加された素材を最優先してください。");
  lines.push("過去の整理結果や以前の結論は固定ではなく、必要なら上書きして構いません。");

  if (intent.preferLatestMaterial) {
    lines.push("新しく追加された資料・最新入力を、古い整理結果より優先してください。");
  }

  if (intent.allowRevision) {
    lines.push("以前の選定・結論と矛盾しても、最新指示に合わせて更新してください。");
  }

  if (intent.requireDifferentSelection) {
    lines.push("変更指示がある場合は、以前と同じ候補を維持せず、必ず別の候補・別の選定結果に置き換えてください。");
  }

  const targetLanguage = intent.finalOutputLanguage || intent.translateTo;
  if (targetLanguage) {
    lines.push(`出力言語は${targetLanguage}を優先してください。`);
  }

  if (intent.summarize) {
    lines.push("冗長さを避け、要点が分かる要約として整理してください。");
  }

  if (intent.bulletize) {
    lines.push("必要に応じて箇条書きを使ってください。");
  }

  if (intent.preserveAllText) {
    lines.push("重要情報の脱落を避け、できるだけ情報を保持してください。");
  }

  if (intent.exact) {
    lines.push("固有名詞・数値・関係性は正確さを優先してください。");
  }

  if (intent.focusQuery) {
    lines.push(`「${intent.focusQuery}」に直接関係する内容だけを優先的に抽出・整理してください。`);
  }

  if (intent.extractOnly) {
    lines.push("不要な周辺情報は広げず、指定された対象だけを抽出してください。");
  }

  if (intent.includeTopics.length > 0) {
    lines.push(`必ず扱うトピック: ${intent.includeTopics.join(" / ")}`);
  }

  if (intent.excludeTopics.length > 0) {
    lines.push(`除外するトピック: ${intent.excludeTopics.join(" / ")}`);
  }

  if (intent.tone) {
    lines.push(`文体・トーンの希望: ${intent.tone}`);
  }

  if (intent.formality) {
    lines.push(`フォーマル度: ${intent.formality}`);
  }

  if (intent.dialect) {
    lines.push(`方言・話法: ${intent.dialect}`);
  }

  if (intent.persona) {
    lines.push(`話者ペルソナ: ${intent.persona}`);
  }

  if (intent.audience) {
    lines.push(`想定読者: ${intent.audience}`);
  }

  if (intent.maxLength) {
    lines.push(`長さ上限の目安: ${intent.maxLength}`);
  }

  if (intent.minLength) {
    lines.push(`長さ下限の目安: ${intent.minLength}`);
  }

  if (intent.structureHint) {
    lines.push(`構成指示: ${intent.structureHint}`);
  }

  if (intent.keepQuotes) {
    lines.push("意味のある引用表現は保持してください。");
  }

  return Array.from(new Set(lines)).join("\n");
}

function indentForSafePrompt(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join("\n");
}

function buildTransformPrompt(text: string, intent: TransformIntent): string {
  const instructions: string[] = [];

  if (intent.translateTo) {
    instructions.push(`Rewrite the source text in ${intent.translateTo}. The output itself must be in ${intent.translateTo}.`);
  }

  if (intent.summarize) {
    instructions.push("Summarize the source text while keeping the key facts and the user's stated requirements.");
  }

  if (intent.bulletize) {
    instructions.push("Use clean bullet points when appropriate.");
  }

  if (intent.outputFormat === "numbered_list") {
    instructions.push("Return the result as a numbered list.");
  }

  if (intent.outputFormat === "table") {
    instructions.push("Return the result as a concise table if feasible.");
  }

  if (intent.outputFormat === "json") {
    instructions.push("Return valid JSON only.");
  }

  if (intent.outputFormat === "markdown") {
    instructions.push("Use markdown formatting where appropriate.");
  }

  if (intent.preserveAllText) {
    instructions.push("Keep all material details that appear important in the original text.");
  }

  if (intent.exact) {
    instructions.push("Do not paraphrase away concrete facts, proper nouns, or explicit relationships.");
  }

  if (intent.focusQuery) {
    instructions.push(`Extract only the parts that are directly relevant to: ${intent.focusQuery}.`);
  }

  if (intent.extractOnly) {
    instructions.push("Do not include unrelated sections or surrounding material.");
  }

  if (intent.includeTopics.length > 0) {
    instructions.push(`The output must include these topics if present: ${intent.includeTopics.join(", ")}.`);
  }

  if (intent.excludeTopics.length > 0) {
    instructions.push(`Exclude these topics unless absolutely necessary: ${intent.excludeTopics.join(", ")}.`);
  }

  if (intent.tone) {
    instructions.push(`Use this tone: ${intent.tone}.`);
  }

  if (intent.formality) {
    instructions.push(`Use this formality level: ${intent.formality}.`);
  }

  if (intent.dialect) {
    instructions.push(`Use this dialect or speech style if natural: ${intent.dialect}.`);
  }

  if (intent.persona) {
    instructions.push(`Write with this persona: ${intent.persona}.`);
  }

  if (intent.audience) {
    instructions.push(`Target this audience: ${intent.audience}.`);
  }

  if (intent.maxLength) {
    instructions.push(`Keep within this maximum length target: ${intent.maxLength}.`);
  }

  if (intent.minLength) {
    instructions.push(`Try to satisfy this minimum length target: ${intent.minLength}.`);
  }

  if (intent.structureHint) {
    instructions.push(intent.structureHint);
  }

  if (intent.keepQuotes) {
    instructions.push("Preserve meaningful original quotations when possible.");
  }

  instructions.push("Return only the transformed text.");
  instructions.push("Do not add commentary, headers, explanations, or quotes around the result.");
  instructions.push("If multiple instructions apply, satisfy all of them in one final output.");

  return [
    "You are a text transformation engine.",
    "Your only job is to rewrite SOURCE_TEXT according to the instructions.",
    "",
    "INSTRUCTIONS:",
    ...instructions.map((line) => `- ${line}`),
    "",
    "SOURCE_TEXT_START",
    indentForSafePrompt(text),
    "SOURCE_TEXT_END",
  ].join("\n");
}

export async function transformTextWithIntent(args: {
  text: string;
  intent: TransformIntent;
  reasoningMode?: ReasoningMode;
}): Promise<{ text: string; usage: UsageSummary | null }> {
  if (!shouldTransformContent(args.intent)) {
    return {
      text: args.text,
      usage: null,
    };
  }

  const res = await fetch("/api/chatgpt", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode: "chat",
      memory: null,
      recentMessages: [],
      input: buildTransformPrompt(args.text, args.intent),
      instructionMode: "normal",
      reasoningMode: args.reasoningMode === "strict" ? "strict" : "creative",
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      typeof data?.error === "string" ? data.error : "transform request failed"
    );
  }

  const reply =
    typeof data?.reply === "string" && data.reply.trim()
      ? data.reply.trim()
      : args.text;

  return {
    text: reply,
    usage: data?.usage ?? null,
  };
}

export function splitTextIntoKinChunks(
  text: string,
  maxChars = 3400,
  reserveChars = 260
): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const effectiveMax = Math.max(1200, maxChars - reserveChars);
  if (normalized.length <= effectiveMax) return [normalized];

  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (current.trim()) {
      chunks.push(current.trim());
      current = "";
    }
  };

  const addUnit = (unit: string) => {
    const trimmed = unit.trim();
    if (!trimmed) return;

    if (!current) {
      current = trimmed;
      return;
    }

    const candidate = `${current}\n\n${trimmed}`;
    if (candidate.length <= effectiveMax) {
      current = candidate;
      return;
    }

    pushCurrent();
    current = trimmed;
  };

  const splitLongUnit = (unit: string): string[] => {
    const trimmed = unit.trim();
    if (!trimmed) return [];
    if (trimmed.length <= effectiveMax) return [trimmed];

    const lineChunks: string[] = [];
    let buffer = "";

    trimmed.split(/\n/).forEach((line) => {
      const normalizedLine = line.trim();
      if (!normalizedLine) return;

      if (normalizedLine.length > effectiveMax) {
        if (buffer) {
          lineChunks.push(buffer.trim());
          buffer = "";
        }
        for (let i = 0; i < normalizedLine.length; i += effectiveMax) {
          lineChunks.push(normalizedLine.slice(i, i + effectiveMax));
        }
        return;
      }

      const candidate = buffer ? `${buffer}\n${normalizedLine}` : normalizedLine;
      if (candidate.length <= effectiveMax) {
        buffer = candidate;
      } else {
        if (buffer) {
          lineChunks.push(buffer.trim());
        }
        buffer = normalizedLine;
      }
    });

    if (buffer.trim()) {
      lineChunks.push(buffer.trim());
    }

    return lineChunks;
  };

  if (paragraphs.length > 0) {
    paragraphs.forEach((paragraph) => {
      splitLongUnit(paragraph).forEach(addUnit);
    });
  } else {
    splitLongUnit(normalized).forEach(addUnit);
  }

  pushCurrent();
  return chunks;
}
