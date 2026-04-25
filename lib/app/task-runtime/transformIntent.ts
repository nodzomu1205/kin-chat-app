import type { TransformIntent } from "@/lib/app/task-runtime/transformIntentTypes";
import { normalizeDirectiveText } from "@/lib/app/task-runtime/transformIntentParser";

export type { TransformIntent } from "@/lib/app/task-runtime/transformIntentTypes";
export { parseTransformIntent } from "@/lib/app/task-runtime/transformIntentParser";
export { resolveTransformIntent } from "@/lib/app/task-runtime/transformIntentResolver";
export {
  shouldTransformContent,
  transformTextWithIntent,
} from "@/lib/app/task-runtime/transformIntentRuntime";
export { splitTextIntoKinChunks } from "@/lib/app/task-runtime/transformIntentChunking";
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

