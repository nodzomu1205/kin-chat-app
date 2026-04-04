export type ParsedTaskInput = {
  searchQuery: string;
  title: string;
  userInstruction: string;
  freeText: string;
};

const PREFIX_PATTERNS = {
  search: /^検索[:：]\s*(.+)$/i,
  title: /^タイトル[:：]\s*(.+)$/i,
  instruction: /^追加指示[:：]\s*(.+)$/i,
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

    const searchMatch = line.match(PREFIX_PATTERNS.search);
    if (searchMatch) {
      searchQuery = searchMatch[1].trim();
      continue;
    }

    const titleMatch = line.match(PREFIX_PATTERNS.title);
    if (titleMatch) {
      title = titleMatch[1].trim();
      continue;
    }

    const instructionMatch = line.match(PREFIX_PATTERNS.instruction);
    if (instructionMatch) {
      userInstruction = instructionMatch[1].trim();
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
