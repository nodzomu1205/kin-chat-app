import type { KinBlockMode } from "@/lib/app/kin-protocol/kinStructuredProtocol";
import type { ReasoningMode } from "@/lib/app/task-runtime/reasoningMode";
import {
  buildDefaultIntent,
  normalizeDirectiveText,
} from "@/lib/app/task-runtime/transformIntentParser";
import type {
  TransformIntent,
  UsageSummary,
} from "@/lib/app/task-runtime/transformIntentTypes";

type PartialIntentPayload = Partial<TransformIntent> & {
  mode?: KinBlockMode;
};

function hasExplicitModePrefix(input: string): boolean {
  return /^(?:\s*)(INFO|SYS_INFO|TASK|SYS_TASK)\s*[:：]/i.test(input);
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

function mergeStringArray(
  baseItems: string[],
  patchItems: unknown
): string[] {
  const parsed = parseStringArray(patchItems);
  return parsed.length > 0 ? Array.from(new Set([...baseItems, ...parsed])) : baseItems;
}

function mergeIntent(
  base: TransformIntent,
  patch: PartialIntentPayload | null | undefined,
  explicitModeLocked: boolean
): TransformIntent {
  if (!patch) return base;

  return {
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
    includeTopics: mergeStringArray(base.includeTopics, patch.includeTopics),
    excludeTopics: mergeStringArray(base.excludeTopics, patch.excludeTopics),
    extraDirectiveLines: mergeStringArray(
      base.extraDirectiveLines,
      patch.extraDirectiveLines
    ),
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
