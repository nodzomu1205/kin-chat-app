export type ParsedTaskInput = {
  searchQuery: string;
  title: string;
  userInstruction: string;
  freeText: string;
};

const PREFIX_SEARCH_JA = "\u691c\u7d22";
const PREFIX_TITLE_JA = "\u30bf\u30a4\u30c8\u30eb";
const PREFIX_INSTRUCTION_JA = "\u8ffd\u52a0\u6307\u793a";
const PREFIX_INSTRUCTION_SHORT_JA = "\u6307\u793a";
function extractPrefixedValue(line: string, prefixes: string[]) {
  const normalizedLine = line.normalize("NFKC").trim();

  for (const prefix of prefixes) {
    const normalizedPrefix = prefix.normalize("NFKC").toLowerCase();
    const lowerLine = normalizedLine.toLowerCase();
    if (!lowerLine.startsWith(normalizedPrefix)) {
      continue;
    }

    const rest = normalizedLine.slice(normalizedPrefix.length).trimStart();
    if (!rest.startsWith(":")) {
      continue;
    }

    return rest.slice(1).trim();
  }

  return "";
}

export function parseTaskInput(text: string): ParsedTaskInput {
  const lines = text.split(/\r?\n/);

  let searchQuery = "";
  let title = "";
  let userInstruction = "";
  const freeLines: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const nextSearchQuery = extractPrefixedValue(line, [
      PREFIX_SEARCH_JA,
      "search",
    ]);
    if (nextSearchQuery) {
      searchQuery = nextSearchQuery;
      continue;
    }

    const nextTitle = extractPrefixedValue(line, [PREFIX_TITLE_JA, "title"]);
    if (nextTitle) {
      title = nextTitle;
      continue;
    }

    const nextUserInstruction = extractPrefixedValue(line, [
      PREFIX_INSTRUCTION_JA,
      PREFIX_INSTRUCTION_SHORT_JA,
      "instruction",
    ]);
    if (nextUserInstruction) {
      userInstruction = nextUserInstruction;
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
