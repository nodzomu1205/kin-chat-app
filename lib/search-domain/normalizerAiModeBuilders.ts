import type {
  NormalizedSearchPayload,
  SearchRequest,
} from "@/lib/search-domain/types";
import { buildRawBlock } from "@/lib/search-domain/normalizerRawBlocks";
import type { SearchSourceItem } from "@/types/task";

export type AskAiModeItem = {
  question?: string;
  title?: string;
  snippet?: string;
  link?: string;
  serpapi_link?: string;
};

type AiModeListItem = {
  snippet?: string;
  text_blocks?: AiModeTextBlock[];
  code_block?: {
    language?: string;
    code?: string;
  };
};

export type AiModeTextBlock = {
  type?: string;
  snippet?: string;
  list?: AiModeListItem[];
  text_blocks?: AiModeTextBlock[];
  table?: unknown[];
  formatted?: unknown;
  language?: string;
  code?: string;
  code_block?: {
    language?: string;
    code?: string;
  };
  title?: string;
  reference_indexes?: number[];
};

type GenericRecord = Record<string, unknown>;

export function normalizeAskAiModeItems(value: unknown): AskAiModeItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => item as AskAiModeItem)
    .filter(
      (item) =>
        item.question || item.title || item.snippet || item.link || item.serpapi_link
    );
}

export function buildAskAiModeBlock(items: AskAiModeItem[]) {
  if (items.length === 0) return "";
  return [
    "Ask AI Mode",
    ...items.map((item) =>
      [
        `- ${item.question || item.title || item.snippet || "Ask AI follow-up"}`,
        item.link ? `  URL: ${item.link}` : "",
        item.serpapi_link ? `  SerpApi: ${item.serpapi_link}` : "",
        item.snippet ? `  Snippet: ${item.snippet}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    ),
  ].join("\n");
}

function formatReferenceIndexes(referenceIndexes?: number[]) {
  if (!referenceIndexes || referenceIndexes.length === 0) return "";
  return ` [refs: ${referenceIndexes.join(", ")}]`;
}

function normalizeComparableText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export function buildAiModeSummary(blocks: AiModeTextBlock[]) {
  const snippets = blocks.flatMap((block): string[] => {
    if (block.type === "list" && Array.isArray(block.list)) {
      return block.list.flatMap((item) => [
        ...(item.snippet?.trim() ? [item.snippet.trim()] : []),
        ...(item.text_blocks ? buildAiModeSummary(item.text_blocks).split("\n").filter(Boolean) : []),
      ]);
    }
    return block.snippet?.trim() ? [block.snippet.trim()] : [];
  });

  if (snippets.length === 0) return "";
  return snippets.join("\n");
}

function formatCodeBlock(args: { language?: string; code?: string }) {
  const code = args.code?.trim();
  if (!code) return [];
  const language = args.language?.trim() || "";
  return ["", `\`\`\`${language}`, code, "```"];
}

function pushFormattedTable(lines: string[], block: AiModeTextBlock) {
  const formattedRows = Array.isArray(block.table)
    ? formatTableRows(block.table)
    : Array.isArray(block.formatted)
      ? formatTableRows(block.formatted)
      : "";
  if (!formattedRows) return false;

  lines.push("", formattedRows);
  return true;
}

function pushAiModeBlock(lines: string[], block: AiModeTextBlock) {
  const refSuffix = formatReferenceIndexes(block.reference_indexes);

  if (block.type === "heading" && block.snippet?.trim()) {
    lines.push("", `## ${block.snippet.trim()}${refSuffix}`);
    return;
  }

  if (block.type === "code_block" || block.code?.trim()) {
    lines.push(...formatCodeBlock({ language: block.language, code: block.code }));
    return;
  }

  if (block.code_block?.code?.trim()) {
    lines.push(
      ...formatCodeBlock({
        language: block.code_block.language,
        code: block.code_block.code,
      })
    );
    return;
  }

  if (block.type === "table" && pushFormattedTable(lines, block)) {
    return;
  }

  if (block.type === "chart_block") {
    const title = block.title?.trim() || block.snippet?.trim();
    if (title) lines.push("", `> **${title}${refSuffix}**`);
    return;
  }

  if (block.type === "list" && Array.isArray(block.list) && block.list.length > 0) {
    lines.push("");
    block.list.forEach((item) => {
      const text = item.snippet?.trim();
      if (text) {
        lines.push(`- ${text}${refSuffix}`);
      }
      if (item.code_block?.code?.trim()) {
        lines.push(
          ...formatCodeBlock({
            language: item.code_block.language,
            code: item.code_block.code,
          })
        );
      }
      item.text_blocks?.forEach((nestedBlock) =>
        pushAiModeBlock(lines, nestedBlock)
      );
    });
    return;
  }

  if (block.snippet?.trim()) {
    lines.push("", `${block.snippet.trim()}${refSuffix}`);
  }

  block.text_blocks?.forEach((nestedBlock) => pushAiModeBlock(lines, nestedBlock));
}

export function buildAiModeRawBlock(blocks: AiModeTextBlock[], fullText?: string) {
  if (blocks.length === 0) {
    if (fullText?.trim()) {
      return ["Google AI Mode", "", fullText.trim()].join("\n");
    }
    return "Google AI Mode\n- No structured AI blocks available";
  }

  const lines: string[] = ["Google AI Mode"];
  const trimmedFullText = fullText?.trim() || "";
  const blockSummary = normalizeComparableText(buildAiModeSummary(blocks));

  if (
    trimmedFullText &&
    normalizeComparableText(trimmedFullText) !== blockSummary
  ) {
    lines.push("", trimmedFullText);
  }

  if (trimmedFullText) {
    return lines.join("\n").trim();
  }

  blocks.forEach((block) => pushAiModeBlock(lines, block));

  return lines.join("\n").trim();
}

function isPlainObject(value: unknown): value is GenericRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function toCellText(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (isPlainObject(value)) {
    const candidateKeys = ["text", "value", "title", "label", "snippet", "name"];
    for (const key of candidateKeys) {
      const cellValue = value[key];
      if (typeof cellValue === "string" && cellValue.trim()) {
        return cellValue.trim();
      }
      if (typeof cellValue === "number" || typeof cellValue === "boolean") {
        return String(cellValue);
      }
    }
  }
  return "";
}

function formatTableRows(rows: unknown[]) {
  const normalizedRows = rows
    .map((row) => {
      if (Array.isArray(row)) {
        return row.map(toCellText).filter(Boolean);
      }
      if (isPlainObject(row)) {
        return Object.values(row).map(toCellText).filter(Boolean);
      }
      return [];
    })
    .filter((cells) => cells.length > 0);

  if (normalizedRows.length === 0) return "";
  return normalizedRows.map((cells) => `| ${cells.join(" | ")} |`).join("\n");
}

export function extractAiModeTables(raw: GenericRecord) {
  const sections: string[] = [];
  const seen = new Set<string>();

  const visit = (value: unknown, path: string[] = []) => {
    if (Array.isArray(value)) {
      if (
        path[path.length - 1] &&
        /(table|tables|grid|rows|columns)/i.test(path[path.length - 1]) &&
        value.length > 0
      ) {
        const formatted = formatTableRows(value);
        if (formatted && !seen.has(formatted)) {
          seen.add(formatted);
          const label = path[path.length - 1]
            .replace(/_/g, " ")
            .replace(/\b\w/g, (m) => m.toUpperCase());
          sections.push(`${label}\n${formatted}`);
        }
      }

      value.forEach((item) => visit(item, path));
      return;
    }

    if (!isPlainObject(value)) return;

    Object.entries(value).forEach(([key, child]) => {
      const lowerKey = key.toLowerCase();

      if (Array.isArray(child) && /(table|tables|grid|rows)/i.test(lowerKey)) {
        const formatted = formatTableRows(child);
        if (formatted && !seen.has(formatted)) {
          seen.add(formatted);
          const label = key.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
          sections.push(`${label}\n${formatted}`);
        }
      }

      visit(child, [...path, key]);
    });
  };

  visit(raw, []);
  return sections;
}

export function buildAiModePayload(args: {
  request: SearchRequest;
  aiSummary: string;
  textBlocks: AiModeTextBlock[];
  fullText: string;
  fallbackSources: SearchSourceItem[];
  aiTables: string[];
  engine: string;
}): NormalizedSearchPayload {
  const rawSections: string[] = [
    buildAiModeRawBlock(args.textBlocks, args.fullText),
  ];

  if (args.aiTables.length > 0) {
    rawSections.push(...args.aiTables);
  }

  if (args.fallbackSources.length > 0) {
    rawSections.push(buildRawBlock("Supporting links", args.fallbackSources));
  }

  return {
    summaryText:
      args.aiSummary ||
      `${args.request.query} について AI mode の要約結果を整理できませんでした。`,
    aiSummary: args.aiSummary,
    rawText: rawSections.join("\n\n"),
    sources: args.fallbackSources,
    metadata: {
      engine: args.engine,
      resultCount: args.fallbackSources.length,
      rawBlocks: args.textBlocks,
      aiTables: args.aiTables,
    },
  };
}
