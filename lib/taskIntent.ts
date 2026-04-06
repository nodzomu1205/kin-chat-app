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

function pickLargestCount(text: string, patterns: RegExp[]) {
  let max = 0;

  for (const pattern of patterns) {
    const globalPattern = pattern.global
      ? pattern
      : new RegExp(pattern.source, `${pattern.flags}g`);

    for (const match of text.matchAll(globalPattern)) {
      const n = Number(match[1]);
      if (Number.isFinite(n)) {
        max = Math.max(max, n);
      }
    }
  }

  return max;
}

function detectAskGptCount(text: string): number {
  return pickLargestCount(text, [
    /GPTに\s*(\d+)回\s*質問/i,
    /(\d+)回[^。\n]{0,12}GPTに質問/i,
    /GPT[^。\n]{0,12}(\d+)回[^。\n]{0,12}質問/i,
  ]);
}

function detectAskUserCount(text: string): number {
  return pickLargestCount(text, [
    /ユーザー(?:に|に対しては)?[^。\n]{0,12}(\d+)回[^。\n]{0,12}質問/i,
    /(\d+)回[^。\n]{0,12}ユーザー[^。\n]{0,12}質問/i,
  ]);
}

function detectAllowMaterialRequest(text: string): boolean {
  return (
    /資料要求/.test(text) ||
    /ユーザー(?:に|に対しては)?[^。\n]{0,16}(?:要求|依頼)/.test(text) ||
    /追加資料/.test(text) ||
    /document|pdf|zip/i.test(text)
  );
}

function detectAllowSearchRequest(text: string): boolean {
  return /検索|Google検索|search/i.test(text);
}

function detectFinalizationPolicy(
  text: string
): "auto_when_ready" | "wait_for_user_confirm" | "wait_for_required_materials" {
  if (/ユーザー確認後|確認してから最終|wait_for_user/i.test(text)) {
    return "wait_for_user_confirm";
  }
  if (/資料待ち|資料が揃うまで|wait_for_required_materials/i.test(text)) {
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
  if (/短め|short/i.test(text)) return "short";
  if (/長め|詳しく|long/i.test(text)) return "long";
  return "medium";
}

function detectEntities(text: string): string[] {
  const candidates = [
    "ナポレオン",
    "マッセナ",
    "ダヴー",
    "ベルティエ",
    "ランヌ",
    "ネイ",
    "グルーシー",
    "ベルナドット",
  ];

  return candidates.filter((x) => text.includes(x));
}

function detectConstraints(text: string): string[] {
  const constraints: string[] = [];

  if (/英語/.test(text)) constraints.push("英語で出力");
  if (/箇条書き/.test(text)) constraints.push("箇条書きで出力");
  if (/短め/.test(text)) constraints.push("短めにまとめる");
  if (/日本語/.test(text)) constraints.push("日本語で出力");

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
    /質問して/.test(text) ||
    /最終成果物/.test(text) ||
    /GPTに質問/.test(text) ||
    /ユーザーに.*質問/.test(text) ||
    /ユーザーに.*要求/.test(text) ||
    /文章を作って/.test(text) ||
    /プレゼン/.test(text) ||
    /魅力について/.test(text)
  );
}
