import type { TaskIntent, TaskOutputType } from "@/types/taskProtocol";

function normalizeText(input: string) {
  return input.replace(/\r\n/g, "\n").trim();
}

function detectGoal(text: string): string {
  const stripped = text
    .replace(/^TASK:\s*/i, "")
    .replace(/^タスク:\s*/i, "")
    .trim();

  return stripped || "タスク内容未設定";
}

function detectOutputType(text: string): TaskOutputType {
  if (/プレゼン|presentation/i.test(text)) return "presentation";
  if (/比較|compare|comparison/i.test(text)) return "comparison";
  if (/箇条書き|bullet/i.test(text)) return "bullet_list";
  if (/返信|reply/i.test(text)) return "reply";
  if (/要約|summary/i.test(text)) return "summary";
  if (/分析|analysis/i.test(text)) return "analysis";
  return "essay";
}

function detectLanguage(text: string): string {
  if (/ロシア語|russian/i.test(text)) return "ru";
  if (/英語|english/i.test(text)) return "en";
  if (/日本語|japanese/i.test(text)) return "ja";
  return "ja";
}

function detectAskGptCount(text: string): number {
  const patterns: Array<[RegExp, number]> = [
    [/GPTに3回質問/i, 3],
    [/GPTに2回質問/i, 2],
    [/GPTに1回質問/i, 1],
    [/3回GPTに質問/i, 3],
    [/2回GPTに質問/i, 2],
    [/1回GPTに質問/i, 1],
    [/3回質問して/i, 3],
    [/2回質問して/i, 2],
    [/1回質問して/i, 1],
  ];

  for (const [re, count] of patterns) {
    if (re.test(text)) return count;
  }

  return 0;
}

function detectAskUserCount(text: string): number {
  const patterns: Array<[RegExp, number]> = [
    [/(Noz|ユーザー).{0,10}3回.*(聞|確認)/i, 3],
    [/(Noz|ユーザー).{0,10}2回.*(聞|確認)/i, 2],
    [/(Noz|ユーザー).{0,10}1回.*(聞|確認)/i, 1],
    [/必要なら.*(Noz|ユーザー).*(聞|確認)/i, 1],
    [/(Noz|ユーザー).*(聞|確認).*して/i, 1],
  ];

  for (const [re, count] of patterns) {
    if (re.test(text)) return count;
  }

  return 0;
}

function detectAllowMaterialRequest(text: string): boolean {
  return /資料|追加資料|注入|document|pdf|zip|メモ/.test(text);
}

function detectAllowSearchRequest(text: string): boolean {
  return /検索|Google検索|SerpAPI|調べて|search/i.test(text);
}

function detectFinalizationPolicy(
  text: string
): "auto_when_ready" | "wait_for_user_confirm" | "wait_for_required_materials" {
  if (/ユーザー.*待って.*最終|確認.*してから最終|wait_for_user/i.test(text)) {
    return "wait_for_user_confirm";
  }
  if (/資料.*待って.*最終|資料.*ないと.*最終|wait_for_required_materials/i.test(text)) {
    return "wait_for_required_materials";
  }
  return "auto_when_ready";
}

function detectTone(text: string): string | undefined {
  if (/フォーマル|formal/i.test(text)) return "formal";
  if (/カジュアル|casual/i.test(text)) return "casual";
  if (/関西弁/i.test(text)) return "kansai";
  return undefined;
}

function detectLength(text: string): "short" | "medium" | "long" | undefined {
  if (/短く|短め|簡潔|short/i.test(text)) return "short";
  if (/長く|詳しく|詳細|long/i.test(text)) return "long";
  return "medium";
}

function detectEntities(text: string): string[] {
  const candidates = [
    "ナポレオン",
    "マッセナ",
    "ダヴー",
    "スールト",
    "ランヌ",
    "ネイ",
    "Johannesburg",
    "ヨハネスブルグ",
  ];

  return candidates.filter((x) => text.includes(x));
}

function detectConstraints(text: string): string[] {
  const constraints: string[] = [];

  if (/同じ言語/.test(text)) constraints.push("同じ言語で出力");
  if (/箇条書き/.test(text)) constraints.push("箇条書き");
  if (/簡潔/.test(text)) constraints.push("簡潔");
  if (/日本人旅行者向け/.test(text)) constraints.push("日本人旅行者向け");

  return constraints;
}

export function parseTaskIntentFromText(input: string): TaskIntent {
  const text = normalizeText(input);
  const goal = detectGoal(text);

  return {
    mode: "task",
    goal,
    output: {
      type: detectOutputType(text),
      language: detectLanguage(text),
      tone: detectTone(text),
      length: detectLength(text),
    },
    workflow: {
      askGptCount: detectAskGptCount(text),
      askUserCount: detectAskUserCount(text),
      allowMaterialRequest: detectAllowMaterialRequest(text),
      allowSearchRequest: detectAllowSearchRequest(text),
      finalizationPolicy: detectFinalizationPolicy(text),
    },
    constraints: detectConstraints(text),
    entities: detectEntities(text),
  };
}

export function looksLikeTaskInstruction(input: string): boolean {
  const text = normalizeText(input);

  return (
    /^TASK:/i.test(text) ||
    /^タスク:/i.test(text) ||
    /Kinに/.test(text) ||
    /最終回答/.test(text) ||
    /質問して/.test(text)
  );
}