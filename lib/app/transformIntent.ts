import type { KinBlockMode } from "@/lib/app/kinStructuredProtocol";

type ResponseMode = "strict" | "creative";

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
  translateTo?: "English" | "Japanese";
  summarize: boolean;
  bulletize: boolean;
  preserveAllText: boolean;
  exact: boolean;
  finalOutputLanguage?: "English" | "Japanese";
  allowRevision: boolean;
  requireDifferentSelection: boolean;
  preferLatestMaterial: boolean;
};

function normalizeDirectiveText(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function parsePrefixedMode(
  input: string,
  defaultMode: KinBlockMode
): { mode: KinBlockMode; body: string } {
  const lines = input.split(/\r?\n/);
  const firstNonEmptyIndex = lines.findIndex((line) => line.trim().length > 0);

  if (firstNonEmptyIndex < 0) {
    return { mode: defaultMode, body: "" };
  }

  const firstLine = lines[firstNonEmptyIndex].trim();
  const match = firstLine.match(/^(INFO|SYS_INFO|TASK|SYS_TASK)\s*[:：]\s*(.*)$/i);

  if (!match) {
    return {
      mode: defaultMode,
      body: normalizeDirectiveText(input),
    };
  }

  const prefix = match[1].toUpperCase();
  const remainder = match[2]?.trim() || "";
  const restLines = lines.slice(firstNonEmptyIndex + 1);

  return {
    mode: prefix.includes("TASK") ? "sys_task" : "sys_info",
    body: normalizeDirectiveText([remainder, ...restLines].join("\n")),
  };
}

function lineHasEnglish(line: string): boolean {
  return /英語|english/i.test(line);
}

function lineHasJapanese(line: string): boolean {
  return /日本語|japanese/i.test(line);
}

function sanitizeDirectiveLine(line: string): string {
  return line.replace(/^(INFO|SYS_INFO|TASK|SYS_TASK)\s*[:：]\s*/i, "").trim();
}

function looksLikeRevisionDirective(line: string): boolean {
  return /変更|差し替|入れ替|再選|再選定|見直し|上書き|更新|override|replace|revise|reselect/i.test(line);
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

export function parseTransformIntent(
  input: string,
  defaultMode: KinBlockMode
): TransformIntent {
  const { mode, body } = parsePrefixedMode(input, defaultMode);
  const cleanedDirective = normalizeDirectiveText(body);
  const directiveLines = cleanedDirective
    .split(/\r?\n/)
    .map((line) => sanitizeDirectiveLine(line))
    .filter(Boolean);

  let translateTo: TransformIntent["translateTo"];
  let summarize = false;
  let bulletize = false;
  let preserveAllText = false;
  let exact = false;
  let finalOutputLanguage: TransformIntent["finalOutputLanguage"];
  let allowRevision = false;
  let requireDifferentSelection = false;
  let preferLatestMaterial = false;
  const extraDirectiveLines: string[] = [];

  directiveLines.forEach((line) => {
    const lower = line.toLowerCase();
    const mentionsOutput =
      /アウトプット|output|reply|response|返答|返事|最終/.test(line);

    if (lineHasEnglish(line)) {
      translateTo = "English";
      if (mentionsOutput) {
        finalOutputLanguage = "English";
      }
    }

    if (lineHasJapanese(line)) {
      translateTo = "Japanese";
      if (mentionsOutput) {
        finalOutputLanguage = "Japanese";
      }
    }

    if (/要約|サマリ|サマリー|summary|summar/i.test(line)) {
      summarize = true;
    }

    if (/箇条書|bullet/i.test(line)) {
      bulletize = true;
    }

    if (/全文|全ての文字|すべての文字|漏れなく|原文|完全版/.test(line)) {
      preserveAllText = true;
    }

    if (/正確|厳密|exact|verbatim/i.test(lower)) {
      exact = true;
    }

    if (looksLikeRevisionDirective(line)) {
      allowRevision = true;
    }

    if (looksLikeDifferentSelectionDirective(line)) {
      requireDifferentSelection = true;
      allowRevision = true;
    }

    if (looksLikeLatestMaterialDirective(line)) {
      preferLatestMaterial = true;
    }

    const isPureTransformInstruction =
      /英語|english|日本語|japanese|要約|サマリ|サマリー|summary|summar|箇条書|bullet|全文|全ての文字|すべての文字|漏れなく|原文|完全版|正確|厳密|exact|verbatim/.test(
        line
      ) && !mentionsOutput;

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
  };
}

export function shouldTransformContent(intent: TransformIntent): boolean {
  return Boolean(
    intent.translateTo ||
      intent.summarize ||
      intent.bulletize ||
      intent.preserveAllText ||
      intent.exact
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
    lines.push(`出力言語は${targetLanguage === "English" ? "英語" : "日本語"}を優先してください。`);
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

  if (intent.preserveAllText) {
    instructions.push("Keep all material details that appear important in the original text.");
  }

  if (intent.exact) {
    instructions.push("Do not paraphrase away concrete facts, proper nouns, or explicit relationships.");
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
  responseMode?: ResponseMode;
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
      reasoningMode: args.responseMode === "strict" ? "strict" : "creative",
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : "transform request failed"
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
  maxChars = 2200
): string[] {
  const normalized = text.trim();
  if (!normalized) return [];
  if (normalized.length <= maxChars) return [normalized];

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
    if (!unit.trim()) return;

    if (!current) {
      current = unit;
      return;
    }

    const candidate = `${current}\n\n${unit}`;
    if (candidate.length <= maxChars) {
      current = candidate;
      return;
    }

    pushCurrent();
    current = unit;
  };

  if (paragraphs.length > 0) {
    paragraphs.forEach((paragraph) => {
      if (paragraph.length <= maxChars) {
        addUnit(paragraph);
        return;
      }

      paragraph.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        if (trimmed.length <= maxChars) {
          addUnit(trimmed);
          return;
        }

        for (let i = 0; i < trimmed.length; i += maxChars) {
          addUnit(trimmed.slice(i, i + maxChars));
        }
      });
    });
  } else {
    for (let i = 0; i < normalized.length; i += maxChars) {
      addUnit(normalized.slice(i, i + maxChars));
    }
  }

  pushCurrent();
  return chunks;
}
