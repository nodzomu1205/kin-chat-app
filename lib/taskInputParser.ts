export type ParsedTaskInput = {
  searchQuery: string;
  title: string;
  userInstruction: string;
  freeText: string;
};

export function parseTaskInput(text: string): ParsedTaskInput {
  const lines = text.split(/\r?\n/);

  let searchQuery = "";
  let title = "";
  let userInstruction = "";
  const freeLines: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("検索：") || line.startsWith("検索:")) {
      searchQuery = line.replace(/^検索[:：]/, "").trim();
      continue;
    }

    if (line.startsWith("タイトル：") || line.startsWith("タイトル:")) {
      title = line.replace(/^タイトル[:：]/, "").trim();
      continue;
    }

    if (line.startsWith("追加指示：") || line.startsWith("追加指示:")) {
      userInstruction = line.replace(/^追加指示[:：]/, "").trim();
      continue;
    }

    freeLines.push(raw);
  }

  return {
    searchQuery,
    title,
    userInstruction,
    freeText: freeLines.join("\n").trim(),
  };
}