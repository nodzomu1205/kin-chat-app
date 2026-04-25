function includesAnyKeyword(text: string, keywords: string[]) {
  const lower = text.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}

function normalizeText(input: string) {
  return input.replace(/\r\n/g, "\n").trim();
}

export function looksLikeKinTaskStartInstruction(input: string): boolean {
  const text = normalizeText(input);
  return (
    /^TASK:/i.test(text) ||
    includesAnyKeyword(text, [
      "Kinに",
      "タスク",
      "課題",
      "レポート",
      "分析して",
      "まとめて",
      "検索",
    ])
  );
}
