type IngestMode = "compact" | "detailed" | "max";
type ImageDetail = "simple" | "detailed" | "max";
type FileUploadKind = "text" | "visual";
type FileReadPolicy = "text_first" | "visual_first" | "hybrid";

const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "json",
  "csv",
  "tsv",
  "js",
  "jsx",
  "ts",
  "tsx",
  "py",
  "java",
  "go",
  "rs",
  "c",
  "cpp",
  "cs",
  "rb",
  "php",
  "html",
  "css",
  "xml",
  "yml",
  "yaml",
  "sql",
]);

const VISUAL_EXTENSIONS = new Set([
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "bmp",
  "svg",
]);

export type {
  FileReadPolicy,
  FileUploadKind,
  ImageDetail,
  IngestMode,
};

export function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

type IngestUsageLike = {
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
};

type IngestOutputLike = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
    }>;
  }>;
};

export function extractIngestOutputText(data: IngestOutputLike): string {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }

  const parts: string[] = [];
  for (const item of data?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (typeof content?.text === "string") {
        parts.push(content.text);
      }
    }
  }

  return parts.join("\n").trim();
}

export function extractIngestUsage(data: IngestUsageLike) {
  const inputTokens =
    typeof data?.usage?.input_tokens === "number" ? data.usage.input_tokens : 0;
  const outputTokens =
    typeof data?.usage?.output_tokens === "number" ? data.usage.output_tokens : 0;
  const totalTokens =
    typeof data?.usage?.total_tokens === "number"
      ? data.usage.total_tokens
      : inputTokens + outputTokens;

  return { inputTokens, outputTokens, totalTokens };
}

export function inferMimeType(file: File) {
  return file.type || "application/octet-stream";
}

export async function fileToBase64(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return buffer.toString("base64");
}

export function getExtension(filename: string) {
  return filename.split(".").pop()?.toLowerCase() || "";
}

export function isTextLikeFile(file: File) {
  const ext = getExtension(file.name);
  return (
    TEXT_EXTENSIONS.has(ext) ||
    file.type.startsWith("text/") ||
    file.type === "application/json"
  );
}

export function isVisualLikeFile(file: File) {
  const ext = getExtension(file.name);
  return VISUAL_EXTENSIONS.has(ext) || file.type.startsWith("image/");
}

export async function tryReadUtf8(file: File) {
  try {
    const text = Buffer.from(await file.arrayBuffer()).toString("utf8");
    if (!text.trim()) return null;
    return text;
  } catch {
    return null;
  }
}

export function splitRawTextIntoLines(text: string, maxLen = 360) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rawLines = normalized.split("\n");
  const result: string[] = [];

  for (const raw of rawLines) {
    const line = raw.trimEnd();
    if (!line) {
      result.push("[blank line]");
      continue;
    }

    let rest = line;
    while (rest.length > maxLen) {
      const candidate = rest.slice(0, maxLen);
      const naturalCut = Math.max(
        candidate.lastIndexOf("。"),
        candidate.lastIndexOf("、"),
        candidate.lastIndexOf(". "),
        candidate.lastIndexOf(" "),
        candidate.lastIndexOf(")"),
        candidate.lastIndexOf("・"),
        candidate.lastIndexOf(":"),
        candidate.lastIndexOf(";")
      );
      const splitAt =
        naturalCut >= Math.floor(maxLen * 0.6) ? naturalCut + 1 : maxLen;

      result.push(rest.slice(0, splitAt).trimEnd());
      rest = rest.slice(splitAt).trimStart();
    }
    if (rest) result.push(rest);
  }

  return result.slice(0, 500);
}

export function normalizeIngestMode(value: unknown): IngestMode {
  if (value === "detailed") return "detailed";
  if (value === "max") return "max";
  return "compact";
}

export function normalizeImageDetail(value: unknown): ImageDetail {
  if (value === "detailed") return "detailed";
  if (value === "max") return "max";
  return "simple";
}

export function normalizePositiveLimit(value: unknown, fallback = 500) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(100, Math.min(10000, Math.floor(n)));
}

export function clipLineNaturally(line: string, limit: number) {
  const trimmed = line.trim();
  if (!trimmed) return "";
  if (trimmed.length <= limit) return trimmed;

  const hardLimit = Math.max(1, limit - 1);
  const candidate = trimmed.slice(0, hardLimit);
  const naturalCut = Math.max(
    candidate.lastIndexOf("。"),
    candidate.lastIndexOf("、"),
    candidate.lastIndexOf(". "),
    candidate.lastIndexOf(" "),
    candidate.lastIndexOf("\n")
  );

  const clipped =
    naturalCut >= Math.floor(hardLimit * 0.55)
      ? candidate.slice(0, naturalCut + 1).trimEnd()
      : candidate.trimEnd();

  return `${clipped}...`;
}

export function clampLinesToCharLimit(lines: string[], limit: number) {
  const normalized = lines.map((line) => line.trim()).filter(Boolean);
  if (normalized.length === 0) return [];

  const result: string[] = [];
  let used = 0;

  for (const line of normalized) {
    const separator = result.length > 0 ? 1 : 0;
    const nextLen = used + separator + line.length;

    if (nextLen <= limit) {
      result.push(line);
      used = nextLen;
      continue;
    }

    const remaining = limit - used - separator;
    if (remaining <= 1) break;

    result.push(clipLineNaturally(line, remaining));
    break;
  }

  return result;
}

export function chooseLinesWithinBudget(
  lines: string[],
  fallbacks: string[],
  limit: number
) {
  const primary = lines.filter(Boolean);
  if (primary.length > 0) return clampLinesToCharLimit(primary, limit);
  return clampLinesToCharLimit(fallbacks.filter(Boolean), limit);
}

export function normalizeUploadKind(value: unknown): FileUploadKind {
  return value === "visual" ? "visual" : "text";
}

export function normalizeFileReadPolicy(value: unknown): FileReadPolicy {
  if (value === "text_first") return "text_first";
  if (value === "visual_first") return "visual_first";
  if (value === "text_and_layout") return "hybrid";
  return "hybrid";
}

export function resolveUploadKind(file: File, requestedKind: FileUploadKind) {
  if (isVisualLikeFile(file)) return "visual" as const;
  if (isTextLikeFile(file)) return "text" as const;
  return requestedKind;
}

export function normalizeParsedIngestResult(params: {
  parsed: {
    title?: string;
    sourceKind?: string;
    rawText?: string;
    structuredSummary?: unknown;
    kinCompact?: unknown;
    kinDetailed?: unknown;
    warnings?: unknown;
  };
  fileName: string;
  mimeType: string;
}) {
  return {
    title: params.parsed.title || params.fileName,
    sourceKind: params.parsed.sourceKind || params.mimeType,
    rawText: params.parsed.rawText || "",
    structuredSummary: Array.isArray(params.parsed.structuredSummary)
      ? params.parsed.structuredSummary
      : [],
    kinCompact: Array.isArray(params.parsed.kinCompact)
      ? params.parsed.kinCompact
      : [],
    kinDetailed: Array.isArray(params.parsed.kinDetailed)
      ? params.parsed.kinDetailed
      : [],
    warnings: Array.isArray(params.parsed.warnings) ? params.parsed.warnings : [],
  };
}
