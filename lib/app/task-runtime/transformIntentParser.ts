import type { KinBlockMode } from "@/lib/app/kin-protocol/kinStructuredProtocol";
import type { TransformIntent } from "@/lib/app/task-runtime/transformIntentTypes";

export function normalizeDirectiveText(text: string): string {
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

export function buildDefaultIntent(
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

export function parseTransformIntent(
  input: string,
  defaultMode: KinBlockMode
): TransformIntent {
  return buildDefaultIntent(input, defaultMode);
}

