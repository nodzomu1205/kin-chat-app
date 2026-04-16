import { suggestTaskTitle } from "@/lib/app/contextNaming";

function normalizeGoalForTitle(goal: string) {
  return goal
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .split(/[。.!！?？]/u)
    .map((part) => part.trim())
    .find(Boolean) || goal.trim();
}

function buildVideoAnalysisTitle(goal: string) {
  const sentence = normalizeGoalForTitle(goal);
  const match = sentence.match(
    /^(.+?)(?:に関する|についての?|の)?(?:動画|映像|コンテンツ)(?:を|で)?/u
  );
  const subject = match?.[1]?.trim();
  if (!subject) return "";

  if (/(?:youtube)/i.test(sentence)) {
    return `${subject}YouTube動画分析`;
  }

  if (/(?:分析|評価|比較|解説|レポート)/u.test(sentence)) {
    return `${subject}動画分析`;
  }

  return `${subject}動画調査`;
}

export function generateTaskTitle(params: {
  goal: string;
  outputType?: string;
  entities?: string[];
}): string {
  const goal = params.goal.trim();

  const structured = suggestTaskTitle({
    freeText: goal,
  });
  const videoAnalysisTitle = buildVideoAnalysisTitle(goal);

  if (videoAnalysisTitle) return videoAnalysisTitle;
  if (structured && structured !== "タスク") return structured;

  if (params.entities && params.entities.length > 0) {
    const joined = params.entities.slice(0, 2).join("・");
    if (params.outputType === "presentation") return `${joined}プレゼン`;
    if (params.outputType === "comparison") return `${joined}比較`;
    return `${joined}整理`;
  }

  if (/ナポレオン/.test(goal) && /部下/.test(goal)) return "ナポレオン部下整理";
  if (/治安/.test(goal)) return "治安整理";
  if (/比較/.test(goal)) return "比較検討";
  if (/返信/.test(goal)) return "返信案作成";

  return goal.slice(0, 18) || "新規タスク";
}
