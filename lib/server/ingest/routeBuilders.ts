import { buildKinSysInfoBlocks, type IngestResult } from "@/lib/shared/kinSysInfo";

export const OPENAI_INGEST_API_URL = "https://api.openai.com/v1/responses";
export const MAX_INGEST_BYTES = 20 * 1024 * 1024;

export function buildTextIngestShortcutResponse(args: {
  fileName: string;
  mimeType: string;
  rawText: string;
  lines: string[];
}) {
  const kinBlocks = buildKinSysInfoBlocks({
    title: args.fileName,
    sourceKind: args.mimeType,
    summaryLevel: "full_text",
    contentLines: args.lines,
    warnings: [],
  });

  return {
    ok: true,
    resolvedKind: "text" as const,
    result: {
      title: args.fileName,
      sourceKind: args.mimeType,
      rawText: args.rawText,
      structuredSummary: [],
      kinCompact: args.lines.slice(0, 12),
      kinDetailed: args.lines,
      warnings: [],
    },
    kinBlocks,
    kinBlock: kinBlocks[0] ?? "",
    usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
  };
}

export function buildOpenAIIngestRequestBody(args: {
  model: string;
  prompt: string;
  fileName: string;
  mimeType: string;
  base64: string;
}) {
  const dataUrl = `data:${args.mimeType};base64,${args.base64}`;
  const fileContent = args.mimeType.startsWith("image/")
    ? {
        type: "input_image",
        image_url: dataUrl,
      }
    : {
        type: "input_file",
        filename: args.fileName,
        file_data: dataUrl,
      };

  return {
    model: args.model,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: args.prompt,
          },
          fileContent,
        ],
      },
    ],
  };
}

export function buildIngestOpenAIErrorResponse(args: {
  detail: unknown;
  status: number;
}) {
  return {
    body: {
      error: "OpenAI ingest failed",
      detail: args.detail,
    },
    status: args.status,
  };
}

export function buildIngestParseFailureResponse(args: {
  raw: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}) {
  return {
    body: {
      error: "Failed to parse ingestion JSON",
      raw: args.raw,
      usage: args.usage,
    },
    status: 500,
  };
}

export function buildIngestSuccessResponse(args: {
  uploadKind: "text" | "visual";
  normalized: IngestResult;
  selectedLines: string[];
  summaryLevel: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}) {
  const kinBlocks = buildKinSysInfoBlocks({
    title: args.normalized.title,
    sourceKind: args.normalized.sourceKind,
    summaryLevel: args.summaryLevel,
    contentLines: args.selectedLines,
    warnings: args.normalized.warnings,
  });

  return {
    ok: true,
    resolvedKind: args.uploadKind,
    result: { ...args.normalized, selectedLines: args.selectedLines },
    kinBlocks,
    kinBlock: kinBlocks[0] ?? "",
    usage: args.usage,
  };
}
