export function generateTaskTitle(params: {
  goal: string;
  outputType?: string;
  entities?: string[];
}): string {
  const goal = params.goal.trim();

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